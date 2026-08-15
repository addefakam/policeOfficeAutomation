from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.utils import timezone
from django.utils.dateparse import parse_date
from .decorators import require_auth, require_role
from .middleware import log_audit, get_client_ip
from .models import CustomUser, AuditLog, ROLE_HIERARCHY
from .forms import LoginForm, UserCreateForm, UserEditForm
from datetime import timedelta

DEMO_ACCOUNTS = [
    {'username': 'admin', 'password': 'admin123', 'role': 'ADMIN'},
    {'username': 'cmdr_haile', 'password': 'cmdr123', 'role': 'STATION_COMMANDER'},
    {'username': 'abebe', 'password': 'inv123', 'role': 'INVESTIGATOR'},
    {'username': 'kebede', 'password': 'inv123', 'role': 'INVESTIGATOR'},
    {'username': 'clerk_tigist', 'password': 'clerk123', 'role': 'CLERK'},
]


def login_view(request):
    # Database is auto-initialised by AutoMigrateMiddleware (first middleware).
    # No need for auto-migrate logic here.
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user:
                if user.locked_until and user.locked_until > timezone.now():
                    messages.error(request, 'Account is locked. Try again later.')
                elif not user.is_active:
                    messages.error(request, 'Account is deactivated.')
                else:
                    user.failed_attempts = 0
                    user.locked_until = None
                    user.save(update_fields=['failed_attempts', 'locked_until'])
                    login(request, user)
                    log_audit(request, 'LOGIN', details={'method': 'form'})
                    return redirect('core:dashboard')
            else:
                try:
                    u = CustomUser.objects.get(username=username)
                    u.failed_attempts += 1
                    if u.failed_attempts >= 5:
                        u.locked_until = timezone.now() + timedelta(minutes=15)
                    u.save(update_fields=['failed_attempts', 'locked_until'])
                except CustomUser.DoesNotExist:
                    pass
                log_audit(request, 'LOGIN_FAILED', details={'username': username})
                messages.error(request, 'Invalid username or password.')
    else:
        form = LoginForm()
    return render(request, 'core/login.html', {'form': form, 'demo_accounts': DEMO_ACCOUNTS})


def logout_view(request):
    if request.user.is_authenticated:
        log_audit(request, 'LOGOUT')
    logout(request)
    return redirect('core:login')


@require_auth
def dashboard(request):
    from django.db import models
    from cases.models import FIR, Officer
    from staff.models import Attendance, LeaveRequest
    from fleet.models import Vehicle, Equipment

    user = request.user
    user_level = ROLE_HIERARCHY.get(user.role, 0)

    # Need-to-know: investigators see only their cases
    if user_level >= ROLE_HIERARCHY.get('STATION_COMMANDER', 3):
        fir_qs = FIR.objects.all()
    elif user.officer:
        fir_qs = FIR.objects.filter(
            models.Q(assigned_to=user.officer) |
            models.Q(team_members__officer=user.officer)
        ).distinct()
    else:
        fir_qs = FIR.objects.none()

    context = {
        'total_firs': fir_qs.count(),
        'open_firs': fir_qs.filter(status='OPEN').count(),
        'investigation_firs': fir_qs.filter(status='UNDER_INVESTIGATION').count(),
        'closed_firs': fir_qs.filter(status='CLOSED').count(),
        'urgent_firs': fir_qs.filter(priority='URGENT', status__in=['OPEN', 'UNDER_INVESTIGATION']).count(),
        'total_officers': Officer.objects.filter(is_active=True).count(),
        'total_vehicles': Vehicle.objects.count(),
        'available_vehicles': Vehicle.objects.filter(status='AVAILABLE').count(),
        'total_equipment': Equipment.objects.count(),
        'pending_leaves': LeaveRequest.objects.filter(status='PENDING').count() if user_level >= 3 else 0,
    }
    return render(request, 'core/dashboard.html', context)


@require_role('ADMIN')
def user_list(request):
    users = CustomUser.objects.select_related('officer').all().order_by('role', 'username')
    return render(request, 'core/user_list.html', {'users': users})


@require_role('ADMIN')
def user_create(request):
    if request.method == 'POST':
        form = UserCreateForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.set_password(form.cleaned_data['password'])
            user.is_staff = (user.role == 'ADMIN')
            user.save()
            log_audit(request, 'CREATE_USER', 'CustomUser', user.id,
                      {'username': user.username, 'role': user.role})
            messages.success(request, f'User "{user.username}" created successfully.')
            return redirect('core:user_list')
    else:
        form = UserCreateForm()
    return render(request, 'core/user_form.html', {'form': form, 'title': 'Create User'})


@require_role('ADMIN')
def user_edit(request, pk):
    user = get_object_or_404(CustomUser, pk=pk)
    if request.method == 'POST':
        form = UserEditForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            log_audit(request, 'UPDATE_USER', 'CustomUser', user.id,
                      {'role': user.role, 'is_active': user.is_active})
            messages.success(request, f'User "{user.username}" updated.')
            return redirect('core:user_list')
    else:
        form = UserEditForm(instance=user)
    return render(request, 'core/user_form.html', {'form': form, 'title': f'Edit User: {user.username}'})


@require_role('ADMIN')
def user_toggle_active(request, pk):
    user = get_object_or_404(CustomUser, pk=pk)
    if user == request.user:
        messages.error(request, 'You cannot deactivate your own account.')
    else:
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        action = 'DEACTIVATE_USER' if not user.is_active else 'UPDATE_USER'
        log_audit(request, action, 'CustomUser', user.id, {'is_active': user.is_active})
        messages.success(request, f'User "{user.username}" {"activated" if user.is_active else "deactivated"}.')
    return redirect('core:user_list')


@require_role('STATION_COMMANDER')
def audit_log_list(request):
    logs = AuditLog.objects.select_related('user').all()

    # Non-admins see only own logs
    user_level = ROLE_HIERARCHY.get(request.user.role, 0)
    if user_level < ROLE_HIERARCHY.get('ADMIN', 4):
        logs = logs.filter(user=request.user)

    # Filters
    action = request.GET.get('action')
    if action:
        logs = logs.filter(action=action)

    model_type = request.GET.get('model_type')
    if model_type:
        logs = logs.filter(model_type=model_type)

    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    if date_from:
        logs = logs.filter(timestamp__date__gte=parse_date(date_from))
    if date_to:
        logs = logs.filter(timestamp__date__lte=parse_date(date_to))

    logs = logs[:200]  # limit
    action_choices = AuditLog.ACTION_CHOICES
    return render(request, 'core/audit_logs.html', {
        'logs': logs, 'action_choices': action_choices,
    })
