from django.shortcuts import render
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from core.decorators import require_auth, require_role
from core.middleware import log_audit
from core.models import ROLE_HIERARCHY
from cases.models import FIR
from staff.models import Attendance, LeaveRequest
from fleet.models import Vehicle, Equipment
from datetime import datetime, timedelta


@require_auth
def dashboard_report(request):
    """Enhanced dashboard with charts data for the reporting module."""
    user = request.user
    user_level = ROLE_HIERARCHY.get(user.role, 0)

    # FIR stats
    fir_qs = FIR.objects.all() if user_level >= 3 else (
        FIR.objects.filter(assigned_to=user.officer) if user.officer else FIR.objects.none()
    )

    # Crime type distribution
    crime_dist = list(fir_qs.values('crime_type').annotate(count=Count('id')).order_by('-count'))

    # Status distribution
    status_dist = list(fir_qs.values('status').annotate(count=Count('id')))

    # Priority distribution
    priority_dist = list(fir_qs.values('priority').annotate(count=Count('id')))

    # Monthly FIR trend (last 6 months)
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_trend = list(
        fir_qs.filter(reporting_date__gte=six_months_ago)
        .annotate(month=TruncDate('reporting_date'))
        .values('month').annotate(count=Count('id'))
        .order_by('month')
    )

    # Officer attendance summary (last 30 days)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    attendance_summary = {
        'present': Attendance.objects.filter(date__gte=thirty_days_ago, status='PRESENT').count(),
        'absent': Attendance.objects.filter(date__gte=thirty_days_ago, status='ABSENT').count(),
        'leave': Attendance.objects.filter(date__gte=thirty_days_ago, status='LEAVE').count(),
    }

    # Fleet summary
    fleet_summary = {
        'total': Vehicle.objects.count(),
        'available': Vehicle.objects.filter(status='AVAILABLE').count(),
        'assigned': Vehicle.objects.filter(status='ASSIGNED').count(),
        'maintenance': Vehicle.objects.filter(status='MAINTENANCE').count(),
    }

    # Equipment by category
    equip_by_cat = list(Equipment.objects.values('category').annotate(count=Count('id')).order_by('-count'))

    # Leave pending
    pending_leaves = LeaveRequest.objects.filter(status='PENDING').count() if user_level >= 3 else 0

    context = {
        'crime_dist': crime_dist,
        'status_dist': status_dist,
        'priority_dist': priority_dist,
        'monthly_trend': monthly_trend,
        'attendance_summary': attendance_summary,
        'fleet_summary': fleet_summary,
        'equip_by_cat': equip_by_cat,
        'pending_leaves': pending_leaves,
        'total_firs': fir_qs.count(),
    }
    return render(request, 'reports/dashboard.html', context)


@require_role('STATION_COMMANDER')
def export_report(request, report_type):
    """Generate and export reports (CSV-style rendering or PDF-ready data)."""
    log_audit(request, 'EXPORT_REPORT', '', '', {'report_type': report_type})
    if report_type == 'firs':
        firs = FIR.objects.select_related('assigned_to').all()
        return render(request, 'reports/export_firs.html', {'firs': firs, 'title': 'FIR Report'})
    elif report_type == 'attendance':
        records = Attendance.objects.select_related('officer', 'marked_by').all()[:500]
        return render(request, 'reports/export_attendance.html', {'records': records, 'title': 'Attendance Report'})
    return redirect('reports:dashboard_report')
