from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages
from .models import ROLE_HIERARCHY


def require_auth(view_func):
    """Require the user to be logged in."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('core:login')
        return view_func(request, *args, **kwargs)
    return wrapper


def require_role(min_role):
    """Require the user to have at least the specified role level.
    Usage: @require_role('INVESTIGATOR')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('core:login')
            user_level = ROLE_HIERARCHY.get(request.user.role, 0)
            required_level = ROLE_HIERARCHY.get(min_role, 0)
            if user_level < required_level:
                messages.error(request, f'Access denied. You need {min_role.replace("_", " ").title()} or higher privileges.')
                return redirect('/')
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_case_access(view_func):
    """Check that the user has access to a specific FIR (need-to-know).
    - Admins and Station Commanders see everything.
    - Others must be on the case team or assigned to it.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('core:login')

        fir_id = kwargs.get('fir_id') or kwargs.get('pk')
        if not fir_id:
            return view_func(request, *args, **kwargs)

        from cases.models import FIR, CaseTeamMember
        user = request.user
        user_level = ROLE_HIERARCHY.get(user.role, 0)

        # Commanders and admins bypass
        if user_level >= ROLE_HIERARCHY.get('STATION_COMMANDER', 3):
            return view_func(request, *args, **kwargs)

        # Check team membership
        try:
            fir = FIR.objects.get(pk=fir_id)
        except FIR.DoesNotExist:
            messages.error(request, 'FIR not found.')
            return redirect('cases:fir_list')

        # Check if user is assigned or on team
        if user.officer:
            if fir.assigned_to_id == user.officer_id:
                return view_func(request, *args, **kwargs)
            if CaseTeamMember.objects.filter(fir=fir, officer_id=user.officer_id).exists():
                return view_func(request, *args, **kwargs)

        # Check consultation requests
        from cases.models import ConsultationRequest
        if ConsultationRequest.objects.filter(fir=fir, responder=user, status='APPROVED').exists():
            return view_func(request, *args, **kwargs)

        messages.error(request, 'Access denied. You do not have access to this case.')
        return redirect('cases:fir_list')

    return wrapper
