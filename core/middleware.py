from django.utils.deprecation import MiddlewareMixin
import json
import logging
import os

logger = logging.getLogger(__name__)

_MIGRATED = os.environ.get('_PDMS_MIGRATED', '0') == '1'


def _ensure_tables():
    """Create tables via schema editor if core_customuser is missing."""
    global _MIGRATED
    if _MIGRATED:
        return
    try:
        from django.db import connections
        conn = connections['default']
        with conn.cursor() as cursor:
            if conn.vendor == 'postgresql':
                cursor.execute(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema='public' AND table_name='core_customuser'"
                )
            elif conn.vendor == 'sqlite':
                cursor.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='core_customuser'"
                )
            else:
                return
            exists = cursor.fetchone()

        if not exists:
            logger.info('[PDMS] Tables missing — creating via schema editor...')
            from django.apps import apps
            all_models = []
            for ac in apps.get_app_configs():
                if ac.models_module:
                    all_models.extend(ac.get_models())
            # Topological sort
            model_names = {m._meta.label for m in all_models}
            sorted_models = []
            remaining = list(all_models)
            for _ in range(len(all_models) + 1):
                if not remaining:
                    break
                batch, still = [], []
                for model in remaining:
                    deps = [f.related_model._meta.label for f in model._meta.get_fields()
                            if f.is_relation and f.many_to_one and hasattr(f, 'related_model')
                            and f.related_model and f.related_model._meta.label in model_names
                            and f.related_model._meta.label != model._meta.label]
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
                except Exception:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
            logger.info('[PDMS] Tables created — seeding...')
            from seed_data import seed
            seed()
            logger.info('[PDMS] Seed complete.')

        _MIGRATED = True
        os.environ['_PDMS_MIGRATED'] = '1'
    except Exception as e:
        logger.warning(f'[PDMS] Auto-migrate skipped: {e}')


class AutoMigrateMiddleware(MiddlewareMixin):
    def process_request(self, request):
        _ensure_tables()
        return None


class AuditMiddleware(MiddlewareMixin):
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
