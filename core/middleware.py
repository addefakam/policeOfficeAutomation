from django.utils.deprecation import MiddlewareMixin
import json
import logging
import os

logger = logging.getLogger(__name__)

# ── Auto-migrate flag (per serverless instance) ──
_MIGRATED = os.environ.get('_PDMS_MIGRATED', '0') == '1'


def _ensure_tables():
    """Run migrations + seed if tables don't exist yet.
    Uses raw SQL check to avoid importing models that depend on the tables.
    """
    global _MIGRATED
    if _MIGRATED:
        return
    try:
        from django.db import connections
        conn = connections['default']
        # Check if core_customuser table exists (raw SQL, no model import)
        with conn.cursor() as cursor:
            db_engine = conn.vendor
            if db_engine == 'postgresql':
                cursor.execute(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema='public' AND table_name='core_customuser'"
                )
            elif db_engine == 'sqlite':
                cursor.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='core_customuser'"
                )
            else:
                return  # unknown engine, skip
            exists = cursor.fetchone()
        
        if not exists:
            logger.info('[PDMS] Tables missing — running migrations...')
            from django.core.management import call_command
            call_command('migrate', verbosity=0, interactive=False)
            logger.info('[PDMS] Migrations done — seeding...')
            import importlib
            seed = importlib.import_module('seed_data')
            seed.seed()
            logger.info('[PDMS] Seed complete.')
        
        _MIGRATED = True
        os.environ['_PDMS_MIGRATED'] = '1'
    except Exception as e:
        logger.error(f'[PDMS] Auto-migrate failed: {e}')


class AutoMigrateMiddleware(MiddlewareMixin):
    """Runs migrations on first request if tables are missing."""
    def process_request(self, request):
        _ensure_tables()
        return None


class AuditMiddleware(MiddlewareMixin):
    """Middleware that logs audit entries queued by views."""
    def process_response(self, request, response):
        if hasattr(request, '_audit_entries'):
            from .models import AuditLog
            for entry in request._audit_entries:
                try:
                    AuditLog.objects.create(**entry)
                except Exception:
                    logger.exception('Audit log failed')
        return response


def log_audit(request, action, model_type='', object_id='', details=None):
    """Utility function to log an audit entry."""
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
