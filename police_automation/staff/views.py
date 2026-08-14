from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from core.decorators import require_auth, require_role
from core.middleware import log_audit
from core.models import ROLE_HIERARCHY
from .models import Attendance, LeaveRequest, DutyAssignment
from cases.models import Officer


@require_auth
def officer_list(request):
    officers = Officer.objects.filter(is_active=True)
    return render(request, 'staff/officer_list.html', {'officers': officers})


@require_role('CLERK')
def mark_attendance(request):
    officers = Officer.objects.filter(is_active=True)
    today = timezone.now().date()
    if request.method == 'POST':
        for officer in officers:
            status_key = f'status_{officer.id}'
            status = request.POST.get(status_key)
            if status:
                Attendance.objects.update_or_create(
                    officer=officer, date=today,
                    defaults={'status': status, 'marked_by': request.user}
                )
        log_audit(request, 'MARK_ATTENDANCE', 'Attendance', '', {'date': str(today)})
        messages.success(request, f'Attendance marked for {today}.')
        return redirect('staff:attendance')
    existing = {a.officer_id: a for a in Attendance.objects.filter(date=today)}
    return render(request, 'staff/attendance.html', {
        'officers': officers, 'today': today, 'existing': existing
    })


@require_auth
def leave_request_list(request):
    user_level = ROLE_HIERARCHY.get(request.user.role, 0)
    leaves = LeaveRequest.objects.select_related('officer', 'approved_by').all()
    if user_level < ROLE_HIERARCHY.get('STATION_COMMANDER', 3):
        if request.user.officer:
            leaves = leaves.filter(officer=request.user.officer)
    status = request.GET.get('status')
    if status:
        leaves = leaves.filter(status=status)
    return render(request, 'staff/leave_list.html', {'leaves': leaves})


@require_auth
def leave_request_create(request):
    if not request.user.officer:
        messages.error(request, 'Your account is not linked to an officer profile.')
        return redirect('staff:leave_list')
    if request.method == 'POST':
        lr = LeaveRequest.objects.create(
            officer=request.user.officer,
            leave_type=request.POST.get('leave_type'),
            start_date=request.POST.get('start_date'),
            end_date=request.POST.get('end_date'),
            reason=request.POST.get('reason'),
        )
        log_audit(request, 'CREATE_LEAVE', 'LeaveRequest', lr.id, {'type': lr.leave_type})
        messages.success(request, 'Leave request submitted.')
        return redirect('staff:leave_list')
    return render(request, 'staff/leave_form.html')


@require_role('STATION_COMMANDER')
def leave_request_respond(request, pk, action):
    lr = get_object_or_404(LeaveRequest, pk=pk)
    lr.status = 'APPROVED' if action == 'approve' else 'REJECTED'
    lr.approved_by = request.user
    lr.approved_at = timezone.now()
    lr.save()
    log_audit(request, f'{lr.status}_LEAVE', 'LeaveRequest', lr.id, {'officer': lr.officer.full_name})
    messages.success(request, f'Leave request {lr.status.lower()}.')
    return redirect('staff:leave_list')


@require_role('CLERK')
def duty_assignment_list(request):
    assignments = DutyAssignment.objects.select_related('officer', 'assigned_by').all()
    date_filter = request.GET.get('date')
    if date_filter:
        assignments = assignments.filter(date=date_filter)
    assignments = assignments[:100]
    return render(request, 'staff/duty_list.html', {'assignments': assignments})


@require_role('CLERK')
def duty_assignment_create(request):
    officers = Officer.objects.filter(is_active=True)
    if request.method == 'POST':
        DutyAssignment.objects.create(
            officer_id=request.POST.get('officer'),
            date=request.POST.get('date'),
            shift=request.POST.get('shift'),
            location=request.POST.get('location', ''),
            assignment_type=request.POST.get('assignment_type', ''),
            remarks=request.POST.get('remarks', ''),
            assigned_by=request.user,
        )
        log_audit(request, 'ASSIGN_DUTY', 'DutyAssignment', '')
        messages.success(request, 'Duty assignment created.')
        return redirect('staff:duty_list')
    return render(request, 'staff/duty_form.html', {'officers': officers})
