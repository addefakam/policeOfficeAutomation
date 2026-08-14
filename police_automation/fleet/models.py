from django.db import models
from django.conf import settings
from cases.models import Officer


class Vehicle(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'), ('ASSIGNED', 'Assigned'),
        ('MAINTENANCE', 'In Maintenance'), ('OUT_OF_SERVICE', 'Out of Service'),
    )
    TYPE_CHOICES = (
        ('PATROL', 'Patrol Car'), ('VAN', 'Van'),
        ('MOTORCYCLE', 'Motorcycle'), ('TRUCK', 'Truck'),
        ('SUV', 'SUV'), ('OTHER', 'Other'),
    )
    plate_number = models.CharField(max_length=50, unique=True)
    vehicle_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100, blank=True)
    year = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    mileage = models.IntegerField(default=0)
    fuel_capacity = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['plate_number']

    def __str__(self):
        return f"{self.plate_number} - {self.make} {self.model}"


class VehicleAssignment(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='assignments')
    officer = models.ForeignKey(Officer, on_delete=models.CASCADE, related_name='vehicle_assignments')
    assigned_date = models.DateField()
    returned_date = models.DateField(null=True, blank=True)
    purpose = models.TextField(blank=True)
    assigned_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-assigned_date']

    def __str__(self):
        return f"{self.vehicle.plate_number} -> {self.officer.full_name}"


class FuelLog(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_logs')
    date = models.DateField()
    liters = models.FloatField()
    odometer = models.IntegerField(blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    filled_by = models.CharField(max_length=255, blank=True)
    station = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.liters}L on {self.date}"


class MaintenanceRecord(models.Model):
    TYPE_CHOICES = (
        ('ROUTINE', 'Routine'), ('REPAIR', 'Repair'),
        ('INSPECTION', 'Inspection'), ('EMERGENCY', 'Emergency'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    service_date = models.DateField()
    next_service_date = models.DateField(null=True, blank=True)
    performed_by = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-service_date']

    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.get_maintenance_type_display()} ({self.get_status_display()})"


class Equipment(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'), ('ASSIGNED', 'Assigned'),
        ('MAINTENANCE', 'In Maintenance'), ('DECOMMISSIONED', 'Decommissioned'),
    )
    CATEGORY_CHOICES = (
        ('WEAPON', 'Weapon'), ('COMMUNICATION', 'Communication Equipment'),
        ('PROTECTIVE', 'Protective Gear'), ('FORENSIC', 'Forensic Kit'),
        ('SURVEILLANCE', 'Surveillance Equipment'), ('OTHER', 'Other'),
    )
    item_name = models.CharField(max_length=255)
    serial_number = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    assigned_to = models.ForeignKey(Officer, on_delete=models.SET_NULL, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'item_name']

    def __str__(self):
        return f"{self.item_name} ({self.serial_number})"
