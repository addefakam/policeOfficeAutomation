from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


ROLE_CHOICES = (
    ('CLERK', 'Clerk'),
    ('INVESTIGATOR', 'Investigator'),
    ('STATION_COMMANDER', 'Station Commander'),
    ('ADMIN', 'Administrator'),
)

ROLE_HIERARCHY = {'CLERK': 1, 'INVESTIGATOR': 2, 'STATION_COMMANDER': 3, 'ADMIN': 4}


class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('Username is required')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(username, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='CLERK')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    failed_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Link to Officer profile (one-to-one)
    officer = models.OneToOneField(
        'cases.Officer', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='user_account'
    )

    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    def has_min_role(self, min_role):
        return ROLE_HIERARCHY.get(self.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('LOGIN_FAILED', 'Login Failed'),
        ('VIEW_CASE', 'View Case'), ('CREATE_FIR', 'Create FIR'), ('UPDATE_CASE', 'Update Case'),
        ('DELETE_CASE', 'Delete Case'), ('TRANSFER_CASE', 'Transfer Case'), ('CLOSE_CASE', 'Close Case'),
        ('ADD_NOTE', 'Add Investigation Note'),
        ('ADD_TEAM_MEMBER', 'Add Team Member'), ('REMOVE_TEAM_MEMBER', 'Remove Team Member'),
        ('ADD_EVIDENCE', 'Add Evidence'), ('TRANSFER_EVIDENCE', 'Transfer Evidence'),
        ('REQUEST_CONSULTATION', 'Request Consultation'),
        ('APPROVE_CONSULTATION', 'Approve Consultation'), ('REJECT_CONSULTATION', 'Reject Consultation'),
        ('CREATE_USER', 'Create User'), ('UPDATE_USER', 'Update User'), ('DEACTIVATE_USER', 'Deactivate User'),
        ('MARK_ATTENDANCE', 'Mark Attendance'),
        ('APPROVE_LEAVE', 'Approve Leave'), ('REJECT_LEAVE', 'Reject Leave'),
        ('ASSIGN_DUTY', 'Assign Duty'),
        ('ADD_VEHICLE', 'Add Vehicle'), ('ASSIGN_VEHICLE', 'Assign Vehicle'),
        ('ADD_EQUIPMENT', 'Add Equipment'),
        ('EXPORT_REPORT', 'Export Report'),
    )

    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150)
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    model_type = models.CharField(max_length=50, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Audit logs'

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.username} - {self.action}"
