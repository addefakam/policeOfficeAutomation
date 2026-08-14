def global_context(request):
    """Add common context variables to all templates."""
    pending_leave_count = 0
    if request.user.is_authenticated:
        from core.models import ROLE_HIERARCHY
        user_level = ROLE_HIERARCHY.get(request.user.role, 0)
        if user_level >= ROLE_HIERARCHY.get('STATION_COMMANDER', 3):
            from staff.models import LeaveRequest
            pending_leave_count = LeaveRequest.objects.filter(status='PENDING').count()
    return {
        'pending_leave_count': pending_leave_count,
    }
