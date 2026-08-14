from django.db import models
from django.conf import settings


class Officer(models.Model):
    RANK_CHOICES = (
        ('Constable', 'Constable'),
        ('Sergeant', 'Sergeant'),
        ('Inspector', 'Inspector'),
        ('Assistant Commissioner', 'Assistant Commissioner'),
        ('Deputy Commissioner', 'Deputy Commissioner'),
        ('Commissioner', 'Commissioner'),
    )
    badge_number = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    rank = models.CharField(max_length=50, choices=RANK_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    unit = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rank', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.rank}) - {self.badge_number}"


class FIR(models.Model):
    STATUS_CHOICES = (
        ('OPEN', 'Open'), ('UNDER_INVESTIGATION', 'Under Investigation'),
        ('CLOSED', 'Closed'), ('TRANSFERRED', 'Transferred'),
    )
    PRIORITY_CHOICES = (
        ('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High'), ('URGENT', 'Urgent'),
    )
    CRIME_TYPE_CHOICES = (
        ('THEFT', 'Theft'), ('ASSAULT', 'Assault'), ('BURGLARY', 'Burglary'),
        ('FRAUD', 'Fraud'), ('VANDALISM', 'Vandalism'), ('TRAFFIC', 'Traffic Violation'),
        ('CYBERCRIME', 'Cybercrime'), ('DRUG', 'Drug Offense'),
        ('DOMESTIC', 'Domestic Violence'), ('HOMICIDE', 'Homicide'),
        ('ROBBERY', 'Robbery'), ('OTHER', 'Other'),
    )

    fir_number = models.CharField(max_length=50, unique=True)
    complaint_date = models.DateField()
    reporting_date = models.DateTimeField(auto_now_add=True)
    complainant_name = models.CharField(max_length=255)
    complainant_phone = models.CharField(max_length=20, blank=True)
    complainant_address = models.TextField(blank=True)
    crime_type = models.CharField(max_length=30, choices=CRIME_TYPE_CHOICES)
    crime_description = models.TextField()
    incident_location = models.TextField()
    incident_date = models.DateField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='OPEN')
    assigned_to = models.ForeignKey(Officer, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_firs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_firs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-reporting_date']
        verbose_name = 'FIR'
        verbose_name_plural = 'FIRs'

    def __str__(self):
        return f"{self.fir_number} - {self.complainant_name} ({self.get_status_display()})"


class CaseTeamMember(models.Model):
    fir = models.ForeignKey(FIR, on_delete=models.CASCADE, related_name='team_members')
    officer = models.ForeignKey(Officer, on_delete=models.CASCADE, related_name='case_teams')
    role = models.CharField(max_length=50, default='Investigator')
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ('fir', 'officer')

    def __str__(self):
        return f"{self.officer.full_name} -> {self.fir.fir_number}"


class InvestigationNote(models.Model):
    fir = models.ForeignKey(FIR, on_delete=models.CASCADE, related_name='notes')
    officer_name = models.CharField(max_length=255)
    officer_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    note_type = models.CharField(max_length=30, default='PROGRESS')
    created_at = models.DateTimeField(auto_now_add=True)

    # Immutable: no update/delete
    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Note by {self.officer_name} on {self.created_at:%Y-%m-%d}"


class EvidenceItem(models.Model):
    STATUS_CHOICES = (
        ('IN_CUSTODY', 'In Custody'), ('TRANSFERRED', 'Transferred'),
        ('RELEASED', 'Released'), ('DISPOSED', 'Disposed'),
    )
    item_number = models.CharField(max_length=50, unique=True)
    fir = models.ForeignKey(FIR, on_delete=models.CASCADE, related_name='evidence_items')
    description = models.TextField()
    item_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_CUSTODY')
    storage_location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.item_number} - {self.description[:50]}"


class EvidenceCustody(models.Model):
    evidence = models.ForeignKey(EvidenceItem, on_delete=models.CASCADE, related_name='custody_chain')
    received_by = models.ForeignKey(Officer, on_delete=models.SET_NULL, null=True)
    transferred_from = models.ForeignKey(Officer, on_delete=models.SET_NULL, null=True, related_name='transferred_evidence')
    transfer_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['transfer_date']
        verbose_name_plural = 'Evidence custody records'


class ConsultationRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'),
    )
    fir = models.ForeignKey(FIR, on_delete=models.CASCADE, related_name='consultation_requests')
    requestor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_consultations')
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_consultations')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Consultation: {self.requestor} -> {self.responder} ({self.get_status_display()})"
