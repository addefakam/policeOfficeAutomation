from django.utils.deprecation import MiddlewareMixin
import json
import logging
import os
import traceback

logger = logging.getLogger(__name__)

# Per-process flag — works within a single serverless instance
_MIGRATED = os.environ.get('_PDMS_MIGRATED', '0') == '1'

# Advisory lock ID for PostgreSQL (must fit in int4: max 2147483647)
_ADVISORY_LOCK_ID = 987654

# Captured seed error — readable by diag view
_SEED_ERROR = None


def _table_exists(conn, table_name):
    """Check if a table exists in the database."""
    with conn.cursor() as cursor:
        if conn.vendor == 'postgresql':
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema='public' AND table_name=%s",
                [table_name],
            )
        else:
            cursor.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name=%s",
                [table_name],
            )
        return cursor.fetchone() is not None


def _drop_all_tables(conn):
    """Drop every user table in the database. Safe for both PostgreSQL and SQLite."""
    with conn.cursor() as cursor:
        if conn.vendor == 'postgresql':
            # Fetch all table names in the public schema
            cursor.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            )
            tables = [row[0] for row in cursor.fetchall()]
            for t in tables:
                cursor.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE')
            logger.info('[PDMS] Dropped %d PostgreSQL tables: %s', len(tables), tables)
        else:
            cursor.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            tables = [row[0] for row in cursor.fetchall()]
            for t in tables:
                cursor.execute(f'DROP TABLE IF EXISTS "{t}"')
            logger.info('[PDMS] Dropped %d SQLite tables: %s', len(tables), tables)


def _admin_user_exists(conn):
    """Return True if the 'admin' user row exists in core_customuser."""
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM core_customuser WHERE username='admin' LIMIT 1"
        )
        return cursor.fetchone() is not None


def _officers_exist(conn):
    """Return True if at least one officer exists in cases_officer."""
    with conn.cursor() as cursor:
        try:
            cursor.execute("SELECT 1 FROM cases_officer LIMIT 1")
            return cursor.fetchone() is not None
        except Exception:
            return False


def _db_is_ready(conn):
    """Return True if DB has both admin user AND officers (full seed done)."""
    return _admin_user_exists(conn) and _officers_exist(conn)


def _ensure_db():
    """
    Ensure the database is fully initialised AND seeded.

    The check is for BOTH the admin user AND officers, because the
    raw-SQL fallback may have created only the admin user (old code).
    Checking for the admin alone would skip officer creation.

    Strategy (idempotent — safe to call on every request):
      1. If admin user + officers exist → DB is fully ready, return.
      2. Otherwise:
         - Acquire a PostgreSQL advisory lock (if Postgres).
         - Re-check after locking.
         - DROP every table (clean slate, avoids InconsistentMigrationHistory).
         - Run Django's migrate from scratch.
         - Seed demo data.
    """
    global _MIGRATED
    if _MIGRATED:
        return

    from django.db import connections

    conn = connections['default']
    vendor = conn.vendor

    # --- Step 1: fast path — admin user AND officers exist? -------------
    try:
        if _db_is_ready(conn):
            logger.info('[PDMS] Admin user + officers found — DB is ready.')
            _MIGRATED = True
            os.environ['_PDMS_MIGRATED'] = '1'
            return
    except Exception as exc:
        logger.debug('[PDMS] Ready check: %s — proceeding to init.', exc)

    # --- Step 2: determine what state the DB is in ----------------------
    #   A) core_customuser table EXISTS  → Vercel build already migrated,
    #      just need to seed data.
    #   B) core_customuser table MISSING → DB is empty or corrupted;
    #      nuke everything and re-migrate from scratch.

    need_full_init = False
    try:
        if not _table_exists(conn, 'core_customuser'):
            need_full_init = True
    except Exception:
        need_full_init = True

    lock_acquired = False
    try:
        # Acquire an advisory lock on Postgres to serialise init
        if vendor == 'postgresql':
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_lock(%s)', [_ADVISORY_LOCK_ID])
                lock_acquired = True
                logger.info('[PDMS] Acquired advisory lock.')
            except Exception as exc:
                logger.warning('[PDMS] Advisory lock failed: %s', exc)

        # Re-check after locking
        try:
            if _db_is_ready(conn):
                logger.info('[PDMS] Another instance already initialised the DB.')
                _MIGRATED = True
                os.environ['_PDMS_MIGRATED'] = '1'
                return
        except Exception:
            pass

        if need_full_init:
            # --- 2A: full init — drop, migrate, seed ---------------------------
            logger.info('[PDMS] Tables missing — full init (drop + migrate + seed)…')

            # Close all connections for a clean transaction state
            connections.close_all()
            conn = connections['default']

            # Drop everything — nuke the corrupted migration history
            logger.info('[PDMS] Dropping all tables for a clean slate…')
            try:
                _drop_all_tables(conn)
            except Exception as exc:
                logger.error('[PDMS] Failed to drop tables: %s', exc)
                connections.close_all()
                conn = connections['default']
                try:
                    _drop_all_tables(conn)
                except Exception as exc2:
                    logger.error('[PDMS] Retry drop also failed: %s', exc2)
                    return

            # Run Django migrate from scratch
            logger.info('[PDMS] Running Django migrate…')
            from django.core.management import call_command
            try:
                call_command('migrate', verbosity=1, interactive=False)
                logger.info('[PDMS] Migrate completed successfully.')
            except Exception as exc:
                logger.error('[PDMS] Migrate failed: %s\n%s', exc, traceback.format_exc())
                logger.info('[PDMS] Falling back to schema-editor…')
                _schema_editor_fallback(conn)
        else:
            # --- 2B: tables exist (Vercel build migrated), just seed ----------
            logger.info('[PDMS] Tables exist (Vercel build). Skipping migrate, seeding…')

        # Seed demo data (needed in both paths)
        logger.info('[PDMS] Seeding demo data…')
        seed_ok = False
        try:
            from django.db import transaction
            from seed_data import seed
            seed()
            transaction.commit()
            logger.info('[PDMS] Seed completed and committed.')
            seed_ok = True
        except Exception as exc:
            global _SEED_ERROR
            _SEED_ERROR = f'{exc}\n{traceback.format_exc()}'
            logger.error('[PDMS] Seed failed: %s\n%s', exc, _SEED_ERROR)
            try:
                from django.db import transaction
                transaction.rollback()
            except Exception:
                pass

            # ---- Raw-SQL fallback: create officers + users directly  -----------
            # This bypasses the ORM entirely in case of model/field issues.
            logger.info('[PDMS] Attempting raw-SQL fallback (officers + users)…')
            try:
                from django.db import transaction
                from django.contrib.auth.hashers import make_password
                from django.utils import timezone
                # Get a fresh connection — the old one may be in error state
                connections.close_all()
                fresh_conn = connections['default']
                now_iso = timezone.now().isoformat()
                is_pg = fresh_conn.vendor == 'postgresql'
                returning = ' RETURNING id' if is_pg else ''
                conflict = 'ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, is_staff = EXCLUDED.is_staff, is_active = EXCLUDED.is_active, is_superuser = EXCLUDED.is_superuser, updated_at = EXCLUDED.updated_at' if is_pg else 'ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role, is_staff = EXCLUDED.is_staff, is_active = EXCLUDED.is_active, is_superuser = EXCLUDED.is_superuser, updated_at = EXCLUDED.updated_at'
                with fresh_conn.cursor() as cursor:
                    # 1) Officers
                    officers_data = [
                        ('OFF-001', 'Haile Gebremariam', 'Inspector', '0911223344', 'hq@police.gov', 'CID'),
                        ('OFF-002', 'Abebe Kebede', 'Sergeant', '0922334455', 'abebe@police.gov', 'CID'),
                        ('OFF-003', 'Kebede Tadesse', 'Sergeant', '0933445566', 'kebede@police.gov', 'Patrol'),
                        ('OFF-004', 'Tigist Mekonnen', 'Constable', '0944556677', 'tigist@police.gov', 'Reception'),
                        ('OFF-005', 'Dawit Assefa', 'Inspector', '0955667788', 'dawit@police.gov', 'CID'),
                        ('OFF-006', 'Sara Hailu', 'Constable', '0966778899', 'sara@police.gov', 'Patrol'),
                        ('OFF-007', 'Yonas Alemu', 'Sergeant', '0977889900', 'yonas@police.gov', 'Traffic'),
                        ('OFF-008', 'Meron Tesfaye', 'Constable', '0988990011', 'meron@police.gov', 'Admin'),
                    ]
                    for badge, name, rank, phone, email, unit in officers_data:
                        cursor.execute(
                            f"INSERT INTO cases_officer (badge_number, full_name, rank, phone, email, unit, is_active, created_at) "
                            f"VALUES (%s, %s, %s, %s, %s, %s, True, %s) "
                            f"{'ON CONFLICT (badge_number) DO NOTHING' if is_pg else 'ON CONFLICT (badge_number) DO NOTHING'}{returning}",
                            [badge, name, rank, phone, email, unit, now_iso]
                        )
                    logger.info('[PDMS] Raw-SQL fallback: inserted %d officers', len(officers_data))

                    # 2) Users (linked to officers)
                    users_data = [
                        ('admin', 'System Administrator', 'ADMIN', True, 'admin123', None),
                        ('cmdr_haile', 'Cmdr. Haile Gebremariam', 'STATION_COMMANDER', False, 'cmdr123', 'OFF-001'),
                        ('abebe', 'Sgt. Abebe Kebede', 'INVESTIGATOR', False, 'inv123', 'OFF-002'),
                        ('kebede', 'Sgt. Kebede Tadesse', 'INVESTIGATOR', False, 'inv123', 'OFF-003'),
                        ('clerk_tigist', 'Clerk Tigist Mekonnen', 'CLERK', False, 'clerk123', 'OFF-004'),
                    ]
                    for username, full_name, role, is_staff, password, badge in users_data:
                        pw_hash = make_password(password)
                        # Resolve officer FK
                        officer_id = None
                        if badge:
                            cursor.execute(
                                'SELECT id FROM cases_officer WHERE badge_number = %s', [badge])
                            row = cursor.fetchone()
                            if row:
                                officer_id = row[0]
                        cursor.execute(
                            f"INSERT INTO core_customuser (username, full_name, role, is_staff, is_active, is_superuser, failed_attempts, password, officer_id, created_at, updated_at) "
                            f"VALUES (%s, %s, %s, %s, True, True, 0, %s, %s, %s, %s) "
                            f"{conflict}{returning}",
                            [username, full_name, role, is_staff, pw_hash, officer_id, now_iso, now_iso]
                        )
                    logger.info('[PDMS] Raw-SQL fallback: inserted %d users', len(users_data))

                transaction.commit()
                _SEED_ERROR = None
                seed_ok = True
                logger.info('[PDMS] Raw-SQL fallback succeeded (officers + users).')
            except Exception as exc2:
                _SEED_ERROR = f'{_SEED_ERROR}\n\nRaw-SQL fallback also failed: {exc2}\n{traceback.format_exc()}'
                logger.error('[PDMS] Raw-SQL fallback failed: %s', exc2)

        if seed_ok:
            _MIGRATED = True
            os.environ['_PDMS_MIGRATED'] = '1'
            logger.info('[PDMS] Database initialisation complete.')
        else:
            # Do NOT set _MIGRATED — allow retry on next request
            logger.warning('[PDMS] Seed failed — will retry on next request.')

    except Exception as exc:
        logger.error('[PDMS] Database init failed: %s\n%s', exc, traceback.format_exc())

    finally:
        if lock_acquired:
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT pg_advisory_unlock(%s)', [_ADVISORY_LOCK_ID])
            except Exception:
                pass


def _schema_editor_fallback(conn):
    """
    Fallback: create tables directly via schema editor.
    Used only if `migrate` command fails.
    """
    from django.apps import apps

    all_models = []
    for app_config in apps.get_app_configs():
        if app_config.models_module:
            all_models.extend(app_config.get_models())

    # Topological sort: models with no FK deps first
    model_labels = {m._meta.label for m in all_models}
    sorted_models = []
    remaining = list(all_models)
    for _ in range(len(all_models) + 1):
        if not remaining:
            break
        batch, still = [], []
        for model in remaining:
            deps = [
                f.related_model._meta.label
                for f in model._meta.get_fields()
                if f.is_relation
                and hasattr(f, 'related_model')
                and f.related_model
                and f.related_model._meta.label in model_labels
                and f.related_model._meta.label != model._meta.label
            ]
            if all(d in {m._meta.label for m in sorted_models} for d in deps):
                batch.append(model)
            else:
                still.append(model)
        sorted_models.extend(batch)
        remaining = still
    sorted_models.extend(remaining)

    for model in sorted_models:
        try:
            with conn.schema_editor() as se:
                se.create_model(model)
            logger.debug('[PDMS] Schema-editor created: %s', model._meta.label)
        except Exception as exc:
            logger.debug('[PDMS] Schema-editor skip %s: %s', model._meta.label, exc)
            try:
                conn.rollback()
            except Exception:
                pass


# ======================================================================
# Middleware classes
# ======================================================================

class AutoMigrateMiddleware(MiddlewareMixin):
    """
    First middleware: ensures the database is ready before any other
    middleware or view code runs.
    """
    def process_request(self, request):
        _ensure_db()
        return None


class AuditMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if hasattr(request, '_audit_entries'):
            from .models import AuditLog
            for entry in request._audit_entries:
                try:
                    AuditLog.objects.create(**entry)
                except Exception:
                    logger.exception('Audit log write failed')
        return response


def log_audit(request, action, model_type='', object_id='', details=None):
    from .models import AuditLog
    entry = {
        'user': request.user if request.user.is_authenticated else None,
        'username': request.user.username if request.user.is_authenticated else 'Anonymous',
        'action': action,
        'model_type': model_type,
        'object_id': str(object_id) if object_id else '',
        'details': details or {},
        'ip_address': get_client_ip(request),
        'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
    }
    if not hasattr(request, '_audit_entries'):
        request._audit_entries = []
    request._audit_entries.append(entry)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip
    return request.META.get('REMOTE_ADDR')
