from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from core.decorators import require_auth, require_role
from core.middleware import log_audit
from .models import Vehicle, VehicleAssignment, FuelLog, MaintenanceRecord, Equipment
from cases.models import Officer


@require_auth
def vehicle_list(request):
    vehicles = Vehicle.objects.all()
    status = request.GET.get('status')
    if status:
        vehicles = vehicles.filter(status=status)
    return render(request, 'fleet/vehicle_list.html', {'vehicles': vehicles})


@require_role('CLERK')
def vehicle_create(request):
    if request.method == 'POST':
        Vehicle.objects.create(
            plate_number=request.POST.get('plate_number'),
            vehicle_type=request.POST.get('vehicle_type'),
            make=request.POST.get('make'),
            model=request.POST.get('model', ''),
            year=request.POST.get('year') or None,
            mileage=request.POST.get('mileage', 0),
        )
        log_audit(request, 'ADD_VEHICLE', 'Vehicle', '')
        messages.success(request, 'Vehicle added.')
        return redirect('fleet:vehicle_list')
    return render(request, 'fleet/vehicle_form.html')


@require_auth
def vehicle_detail(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk)
    assignments = vehicle.assignments.select_related('officer').all()
    fuel_logs = vehicle.fuel_logs.all()[:50]
    maintenance = vehicle.maintenance_records.all()[:50]
    return render(request, 'fleet/vehicle_detail.html', {
        'vehicle': vehicle, 'assignments': assignments,
        'fuel_logs': fuel_logs, 'maintenance': maintenance,
    })


@require_role('CLERK')
def vehicle_assign(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk)
    if request.method == 'POST':
        VehicleAssignment.objects.create(
            vehicle=vehicle,
            officer_id=request.POST.get('officer'),
            assigned_date=request.POST.get('assigned_date'),
            purpose=request.POST.get('purpose', ''),
            assigned_by=request.user,
        )
        vehicle.status = 'ASSIGNED'
        vehicle.save(update_fields=['status'])
        log_audit(request, 'ASSIGN_VEHICLE', 'VehicleAssignment', '',
                  {'vehicle': vehicle.plate_number})
        messages.success(request, 'Vehicle assigned.')
        return redirect('fleet:vehicle_detail', vehicle.id)
    officers = Officer.objects.filter(is_active=True)
    return render(request, 'fleet/vehicle_assign.html', {'vehicle': vehicle, 'officers': officers})


@require_role('CLERK')
def fuel_log_create(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk)
    if request.method == 'POST':
        FuelLog.objects.create(
            vehicle=vehicle,
            date=request.POST.get('date'),
            liters=request.POST.get('liters'),
            odometer=request.POST.get('odometer') or None,
            cost=request.POST.get('cost') or None,
            filled_by=request.POST.get('filled_by', ''),
            station=request.POST.get('station', ''),
            created_by=request.user,
        )
        messages.success(request, 'Fuel log added.')
        return redirect('fleet:vehicle_detail', vehicle.id)
    return render(request, 'fleet/fuel_form.html', {'vehicle': vehicle})


@require_role('CLERK')
def maintenance_create(request, pk):
    vehicle = get_object_or_404(Vehicle, pk=pk)
    if request.method == 'POST':
        MaintenanceRecord.objects.create(
            vehicle=vehicle,
            maintenance_type=request.POST.get('maintenance_type'),
            description=request.POST.get('description'),
            status=request.POST.get('status', 'PENDING'),
            cost=request.POST.get('cost') or None,
            service_date=request.POST.get('service_date'),
            next_service_date=request.POST.get('next_service_date') or None,
            performed_by=request.POST.get('performed_by', ''),
            created_by=request.user,
        )
        messages.success(request, 'Maintenance record added.')
        return redirect('fleet:vehicle_detail', vehicle.id)
    return render(request, 'fleet/maintenance_form.html', {'vehicle': vehicle})


@require_auth
def equipment_list(request):
    equipment = Equipment.objects.select_related('assigned_to').all()
    category = request.GET.get('category')
    if category:
        equipment = equipment.filter(category=category)
    return render(request, 'fleet/equipment_list.html', {'equipment': equipment})


@require_role('CLERK')
def equipment_create(request):
    if request.method == 'POST':
        Equipment.objects.create(
            item_name=request.POST.get('item_name'),
            serial_number=request.POST.get('serial_number'),
            category=request.POST.get('category'),
            purchase_date=request.POST.get('purchase_date') or None,
            purchase_cost=request.POST.get('purchase_cost') or None,
            notes=request.POST.get('notes', ''),
        )
        log_audit(request, 'ADD_EQUIPMENT', 'Equipment', '')
        messages.success(request, 'Equipment added.')
        return redirect('fleet:equipment_list')
    return render(request, 'fleet/equipment_form.html')
