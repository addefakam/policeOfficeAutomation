from django.utils.deprecation import MiddlewareMixin
import json
import logging

logger = logging.getLogger(__name__)

class AuditMiddleware(MiddlewareMixin):
    """Middleware that makes it easy to log actions from views.
    Views should set request.audit_action and optionally request.audit_details
    before returning a response. The post-FIR-processing in views calls
    log_audit() directly for precision.
    """
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
    """Utility function to log an audit entry.
    Can be called from any view.
    """
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
