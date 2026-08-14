from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.utils import timezone
from core.decorators import require_auth, require_role, require_case_access
from core.middleware import log_audit
from core.models import ROLE_HIERARCHY
from .models import FIR, Officer, CaseTeamMember, InvestigationNote, EvidenceItem, EvidenceCustody, ConsultationRequest
from .forms import FIRForm, NoteForm, EvidenceForm, TeamMemberForm, FIRStatusForm
from datetime import timedelta


def _get_fir_queryset(request):
    """Apply need-to-know filtering."""
    user = request.user
    user_level = ROLE_HIERARCHY.get(user.role, 0)
    if user_level >= ROLE_HIERARCHY.get('STATION_COMMANDER', 3):
        return FIR.objects.select_related('assigned_to', 'created_by').prefetch_related('team_members__officer')
    elif user.officer:
        return FIR.objects.filter(
            assigned_to=user.officer
        ).select_related('assigned_to', 'created_by').prefetch_related('team_members__officer')
    return FIR.objects.none()


@require_auth
def fir_list(request):
    firs = _get_fir_queryset(request)
    # Filters
    status = request.GET.get('status')
    if status:
        firs = firs.filter(status=status)
    crime_type = request.GET.get('crime_type')
    if crime_type:
        firs = firs.filter(crime_type=crime_type)
    priority = request.GET.get('priority')
    if priority:
        firs = firs.filter(priority=priority)
    search = request.GET.get('q')
    if search:
        firs = firs.filter(fir_number__icontains=search) | firs.filter(complainant_name__icontains=search)
    firs = firs[:100]
    return render(request, 'cases/fir_list.html', {'firs': firs})


@require_auth
def fir_create(request):
    if request.method == 'POST':
        form = FIRForm(request.POST)
        if form.is_valid():
            fir = form.save(commit=False)
            # Auto-generate FIR number
            count = FIR.objects.count() + 1
            fir.fir_number = f'FIR-{count:03d}'
            fir.created_by = request.user
            fir.reporting_date = timezone.now()
            fir.save()
            # Auto-add creator as team member if they're an investigator assigned to this FIR
            if request.user.officer and fir.assigned_to == request.user.officer:
                CaseTeamMember.objects.get_or_create(
                    fir=fir, officer=request.user.officer,
                    defaults={'added_by': request.user, 'role': 'Lead Investigator'}
                )
            log_audit(request, 'CREATE_FIR', 'FIR', fir.id,
                      {'fir_number': fir.fir_number, 'crime_type': fir.crime_type})
            messages.success(request, f'FIR {fir.fir_number} created successfully.')
            return redirect('cases:fir_detail', fir.id)
    else:
        form = FIRForm()
    return render(request, 'cases/fir_form.html', {'form': form, 'title': 'Register New FIR'})


@require_auth
@require_case_access
def fir_detail(request, pk):
    fir = get_object_or_404(FIR.objects.select_related('assigned_to'), pk=pk)
    log_audit(request, 'VIEW_CASE', 'FIR', fir.id, {'fir_number': fir.fir_number})
    notes = fir.notes.select_related('officer_user').all()
    evidence = fir.evidence_items.all()
    team = fir.team_members.select_related('officer').all()
    consultations = fir.consultation_requests.select_related('requestor', 'responder').all()
    return render(request, 'cases/fir_detail.html', {
        'fir': fir, 'notes': notes, 'evidence': evidence,
        'team': team, 'consultations': consultations,
        'all_officers': Officer.objects.filter(is_active=True),
    })


@require_auth
@require_case_access
def fir_update(request, pk):
    fir = get_object_or_404(FIR, pk=pk)
    if request.method == 'POST':
        form = FIRStatusForm(request.POST, instance=fir)
        if form.is_valid():
            old_status = fir.status
            old_assigned = fir.assigned_to_id
            form.save()
            changes = {}
            if old_status != fir.status:
                changes['status'] = {'old': old_status, 'new': fir.status}
            if old_assigned != fir.assigned_to_id:
                changes['assigned_to'] = {'old': str(old_assigned), 'new': str(fir.assigned_to_id)}
            action = 'UPDATE_CASE'
            if 'status' in changes:
                if changes['status']['new'] == 'CLOSED':
                    action = 'CLOSE_CASE'
                elif changes['status']['new'] == 'TRANSFERRED':
                    action = 'TRANSFER_CASE'
            log_audit(request, action, 'FIR', fir.id, changes)
            messages.success(request, f'FIR {fir.fir_number} updated.')
            return redirect('cases:fir_detail', fir.id)
    else:
        form = FIRStatusForm(instance=fir)
    return render(request, 'cases/fir_form.html', {'form': form, 'title': f'Update FIR {fir.fir_number}', 'fir': fir})


@require_role('ADMIN')
def fir_delete(request, pk):
    fir = get_object_or_404(FIR, pk=pk)
    log_audit(request, 'DELETE_CASE', 'FIR', fir.id, {'fir_number': fir.fir_number})
    fir.delete()
    messages.success(request, f'FIR {fir.fir_number} deleted.')
    return redirect('cases:fir_list')


@require_auth
@require_case_access
def add_note(request, pk):
    fir = get_object_or_404(FIR, pk=pk)
    if request.method == 'POST':
        form = NoteForm(request.POST)
        if form.is_valid():
            note = form.save(commit=False)
            note.fir = fir
            note.officer_name = request.user.get_full_name() or request.user.username
            note.officer_user = request.user
            note.save()
            log_audit(request, 'ADD_NOTE', 'InvestigationNote', note.id,
                      {'fir': fir.fir_number})
            messages.success(request, 'Note added.')
    return redirect('cases:fir_detail', fir.id)


@require_auth
@require_case_access
def add_team_member(request, pk):
    fir = get_object_or_404(FIR, pk=pk)
    if request.method == 'POST':
        form = TeamMemberForm(request.POST)
        if form.is_valid():
            officer = form.cleaned_data['officer']
            role = form.cleaned_data['role']
            member, created = CaseTeamMember.objects.get_or_create(
                fir=fir, officer=officer,
                defaults={'added_by': request.user, 'role': role}
            )
            if created:
                log_audit(request, 'ADD_TEAM_MEMBER', 'CaseTeamMember', member.id,
                          {'fir': fir.fir_number, 'officer': officer.full_name})
                messages.success(request, f'{officer.full_name} added to case team.')
            else:
                messages.warning(request, f'{officer.full_name} is already on the team.')
    return redirect('cases:fir_detail', fir.id)


@require_auth
@require_case_access
def remove_team_member(request, pk, member_id):
    fir = get_object_or_404(FIR, pk=pk)
    member = get_object_or_404(CaseTeamMember, pk=member_id, fir=fir)
    if member.role == 'Lead Investigator' and not request.user.has_min_role('STATION_COMMANDER'):
        messages.error(request, 'Only commanders can remove the lead investigator.')
    else:
        name = member.officer.full_name
        member.delete()
        log_audit(request, 'REMOVE_TEAM_MEMBER', 'CaseTeamMember', member_id,
                  {'fir': fir.fir_number, 'officer': name})
        messages.success(request, f'{name} removed from team.')
    return redirect('cases:fir_detail', fir.id)


@require_auth
@require_case_access
def add_evidence(request, pk):
    fir = get_object_or_404(FIR, pk=pk)
    if request.method == 'POST':
        form = EvidenceForm(request.POST)
        if form.is_valid():
            evidence = form.save(commit=False)
            count = EvidenceItem.objects.count() + 1
            evidence.item_number = f'EVD-{count:03d}'
            evidence.fir = fir
            evidence.save()
            # Create initial custody record
            EvidenceCustody.objects.create(
                evidence=evidence, received_by=request.user.officer,
                notes='Initial custody on evidence creation'
            )
            log_audit(request, 'ADD_EVIDENCE', 'EvidenceItem', evidence.id,
                      {'item_number': evidence.item_number, 'fir': fir.fir_number})
            messages.success(request, f'Evidence {evidence.item_number} added.')
    return redirect('cases:fir_detail', fir.id)


@require_auth
@require_case_access
def transfer_evidence(request, pk, evidence_id):
    fir = get_object_or_404(FIR, pk=pk)
    evidence = get_object_or_404(EvidenceItem, pk=evidence_id, fir=fir)
    if request.method == 'POST':
        to_officer_id = request.POST.get('to_officer')
        if to_officer_id:
            to_officer = get_object_or_404(Officer, pk=to_officer_id)
            EvidenceCustody.objects.create(
                evidence=evidence, received_by=to_officer,
                transferred_from=request.user.officer,
                notes=request.POST.get('notes', '')
            )
            evidence.status = 'TRANSFERRED'
            evidence.save(update_fields=['status'])
            log_audit(request, 'TRANSFER_EVIDENCE', 'EvidenceItem', evidence.id,
                      {'to': to_officer.full_name})
            messages.success(request, f'Evidence transferred to {to_officer.full_name}.')
    return redirect('cases:fir_detail', fir.id)


def _get_consultation_context(request):
    """Return sent/received consultations for the logged-in user."""
    sent = ConsultationRequest.objects.filter(requestor=request.user).select_related('fir', 'responder')
    received = ConsultationRequest.objects.filter(responder=request.user).select_related('fir', 'requestor')
    return sent, received


@require_auth
def consultation_list(request):
    sent, received = _get_consultation_context(request)
    return render(request, 'cases/consultations.html', {'sent': sent, 'received': received})


@require_auth
def request_consultation(request, fir_id):
    fir = get_object_or_404(FIR, pk=fir_id)
    if request.method == 'POST':
        responder_id = request.POST.get('responder')
        reason = request.POST.get('reason', '')
        if responder_id and reason:
            from core.models import CustomUser
            responder = get_object_or_404(CustomUser, pk=responder_id)
            # Prevent duplicates
            if ConsultationRequest.objects.filter(fir=fir, requestor=request.user, responder=responder, status='PENDING').exists():
                messages.warning(request, 'A pending consultation already exists.')
            else:
                ConsultationRequest.objects.create(
                    fir=fir, requestor=request.user, responder=responder,
                    reason=reason, expires_at=timezone.now() + timedelta(hours=24)
                )
                log_audit(request, 'REQUEST_CONSULTATION', 'ConsultationRequest',
                          {'fir': fir.fir_number, 'responder': responder.username})
                messages.success(request, 'Consultation request sent.')
    return redirect('cases:fir_detail', fir.id)


@require_auth
def respond_consultation(request, pk):
    consultation = get_object_or_404(ConsultationRequest, pk=pk)
    if request.user != consultation.responder and not request.user.has_min_role('STATION_COMMANDER'):
        messages.error(request, 'Only the responder or a commander can respond.')
        return redirect('cases:consultation_list')
    action_type = 'APPROVE' if 'approve' in request.POST else 'REJECT'
    consultation.status = 'APPROVED' if action_type == 'APPROVE' else 'REJECTED'
    consultation.responded_at = timezone.now()
    consultation.save(update_fields=['status', 'responded_at'])
    log_audit(request, f'{action_type}_CONSULTATION', 'ConsultationRequest', consultation.id,
              {'fir': consultation.fir.fir_number, 'decision': consultation.status})
    messages.success(request, f'Consultation {consultation.status.lower()}.')
    return redirect('cases:consultation_list')
