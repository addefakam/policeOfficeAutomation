from django.db import models
from django.conf import settings
from cases.models import Officer


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present'), ('ABSENT', 'Absent'),
        ('LEAVE', 'On Leave'), ('DUTY', 'On Duty'),
    )
    officer = models.ForeignKey(Officer, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('officer', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.officer.full_name} - {self.date} ({self.get_status_display()})"


class LeaveRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'),
    )
    LEAVE_TYPE_CHOICES = (
        ('ANNUAL', 'Annual Leave'), ('SICK', 'Sick Leave'),
        ('EMERGENCY', 'Emergency Leave'), ('MATERNITY', 'Maternity Leave'),
        ('COMPASSIONATE', 'Compassionate Leave'),
    )
    officer = models.ForeignKey(Officer, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=30, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.officer.full_name} - {self.get_leave_type_display()} ({self.get_status_display()})"


class DutyAssignment(models.Model):
    SHIFT_CHOICES = (
        ('MORNING', 'Morning (06:00-14:00)'),
        ('AFTERNOON', 'Afternoon (14:00-22:00)'),
        ('NIGHT', 'Night (22:00-06:00)'),
    )
    officer = models.ForeignKey(Officer, on_delete=models.CASCADE, related_name='duty_assignments')
    date = models.DateField(db_index=True)
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    location = models.CharField(max_length=255, blank=True)
    assignment_type = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'shift']

    def __str__(self):
        return f"{self.officer.full_name} - {self.date} {self.get_shift_display()}"
