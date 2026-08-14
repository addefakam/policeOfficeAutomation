from datetime import date, timedelta
from core.models import CustomUser
from cases.models import Officer, FIR, CaseTeamMember, InvestigationNote, EvidenceItem, EvidenceCustody
from staff.models import Attendance, LeaveRequest, DutyAssignment
from fleet.models import Vehicle, VehicleAssignment, FuelLog, MaintenanceRecord, Equipment


def seed():
    print('Seeding database...')

    # 1. Officers
    officers_data = [
        ('OFF-001', 'Haile Gebremariam', 'Inspector', '0911223344', 'hq@police.gov', 'CID'),
        ('OFF-002', 'Abebe Kebede', 'Sergeant', '0922334455', 'abebe@police.gov', 'CID'),
        ('OFF-003', 'Kebede Tadesse', 'Sergeant', '0933445566', 'kebede@police.gov', 'Patrol'),
        ('OFF-004', 'Tigist Mekonnen', 'Constable', '0944556677', 'tigist@police.gov', 'Reception'),
        ('OFF-005', 'Dawit Assefa', 'Inspector', '0955667788', 'dawit@police.gov', 'CID'),
        ('OFF-006', 'Sara Hailu', 'Constable', '0966778899', 'sara@police.gov', 'Patrol'),
        ('OFF-007', 'Yonas Alemu', 'Sergeant', '0977889900', 'yonas@police.gov', 'Traffic'),
        ('OFF-008', 'Meron Tesfaye', 'Constable', '0988990011', 'meron@police.gov', 'Admin'),
    ]
    officers = {}
    for badge, name, rank, phone, email, unit in officers_data:
        off, _ = Officer.objects.get_or_create(
            badge_number=badge,
            defaults={'full_name': name, 'rank': rank, 'phone': phone, 'email': email, 'unit': unit}
        )
        officers[badge] = off
    print(f'  Created {len(officers)} officers')

    # 2. Users
    users_data = [
        ('admin', 'System Administrator', 'ADMIN', 'admin123', None),
        ('cmdr_haile', 'Cmdr. Haile Gebremariam', 'STATION_COMMANDER', 'cmdr123', 'OFF-001'),
        ('abebe', 'Sgt. Abebe Kebede', 'INVESTIGATOR', 'inv123', 'OFF-002'),
        ('kebede', 'Sgt. Kebede Tadesse', 'INVESTIGATOR', 'inv123', 'OFF-003'),
        ('clerk_tigist', 'Clerk Tigist Mekonnen', 'CLERK', 'clerk123', 'OFF-004'),
    ]
    users = {}
    for username, full_name, role, password, officer_badge in users_data:
        user, created = CustomUser.objects.get_or_create(
            username=username,
            defaults={
                'full_name': full_name,
                'role': role,
                'is_staff': role == 'ADMIN',
                'is_active': True,
                'officer': officers.get(officer_badge),
            }
        )
        if created:
            user.set_password(password)
            user.save(update_fields=['password'])
        users[username] = user
    print(f'  Created {len(users)} users')

    # 3. FIRs
    firs_data = [
        ('FIR-001', 'Robbery at Meskel Square', 'THEFT', 'OPEN', 'HIGH', '2026-07-01', 'Abebe Bekele', officers['OFF-002']),
        ('FIR-002', 'Assault at Bole Michael', 'ASSAULT', 'UNDER_INVESTIGATION', 'MEDIUM', '2026-07-05', 'Chala Tadesse', officers['OFF-002']),
        ('FIR-003', 'Vehicle Theft - Kolfe', 'THEFT', 'OPEN', 'URGENT', '2026-07-10', 'Desta Mekonnen', officers['OFF-002']),
        ('FIR-004', 'Burglary at CMC Area', 'BURGLARY', 'CLOSED', 'LOW', '2026-06-15', 'Hanna Worku', officers['OFF-003']),
        ('FIR-005', 'Fraud - Business Scam', 'FRAUD', 'UNDER_INVESTIGATION', 'HIGH', '2026-07-12', 'Nardos Teklu', officers['OFF-003']),
        ('FIR-006', 'Domestic Violence Report', 'DOMESTIC', 'OPEN', 'MEDIUM', '2026-07-15', 'Selamawit Girma', officers['OFF-005']),
        ('FIR-007', 'Drug Trafficking Tip', 'DRUG', 'UNDER_INVESTIGATION', 'URGENT', '2026-07-18', 'Anonymous', officers['OFF-005']),
        ('FIR-008', 'Cybercrime - Online Fraud', 'CYBERCRIME', 'OPEN', 'HIGH', '2026-08-01', 'Bereket Tadesse', officers['OFF-002']),
    ]
    firs = {}
    for fir_num, title, crime, status, priority, inc_date, complainant, assigned in firs_data:
        fir, _ = FIR.objects.get_or_create(
            fir_number=fir_num,
            defaults={
                'complainant_name': complainant,
                'complaint_date': inc_date,
                'crime_type': crime,
                'crime_description': f'{title}. Investigation is ongoing.',
                'incident_location': 'Addis Ababa, Ethiopia',
                'incident_date': inc_date,
                'priority': priority,
                'status': status,
                'assigned_to': assigned,
                'created_by': users['admin'],
            }
        )
        firs[fir_num] = fir
    print(f'  Created {len(firs)} FIRs')

    # 4. Case team members (auto-add investigators to their cases)
    team_links = [
        ('FIR-001', 'OFF-002', 'Lead Investigator'),
        ('FIR-002', 'OFF-002', 'Lead Investigator'),
        ('FIR-003', 'OFF-002', 'Lead Investigator'),
        ('FIR-003', 'OFF-003', 'Investigator'),
        ('FIR-004', 'OFF-003', 'Lead Investigator'),
        ('FIR-005', 'OFF-003', 'Lead Investigator'),
        ('FIR-006', 'OFF-005', 'Lead Investigator'),
        ('FIR-007', 'OFF-005', 'Lead Investigator'),
        ('FIR-008', 'OFF-002', 'Lead Investigator'),
    ]
    for fir_num, off_badge, role in team_links:
        CaseTeamMember.objects.get_or_create(
            fir=firs[fir_num],
            officer=officers[off_badge],
            defaults={'role': role, 'added_by': users['admin']}
        )
    print(f'  Created case team assignments')

    # 5. Investigation notes
    notes_data = [
        ('FIR-001', 'Visited the crime scene at Meskel Square. Collected CCTV footage from nearby shops. Witness statements taken from 3 bystanders.', 'PROGRESS'),
        ('FIR-001', 'Identified suspect vehicle - white Toyota Corolla plate AA 12345. Checking traffic cameras.', 'EVIDENCE'),
        ('FIR-002', 'Victim interviewed at hospital. Medical report obtained. Suspect identified as known offender.', 'PROGRESS'),
        ('FIR-003', 'Vehicle recovered in Kolfe area. Fingerprints lifted. Forensic analysis pending.', 'EVIDENCE'),
        ('FIR-005', 'Bank records subpoenaed. Multiple victims identified. Case involves organized fraud ring.', 'PROGRESS'),
    ]
    for fir_num, content, ntype in notes_data:
        InvestigationNote.objects.create(
            fir=firs[fir_num],
            officer_name=firs[fir_num].assigned_to.full_name,
            content=content,
            note_type=ntype,
        )
    print(f'  Created investigation notes')

    # 6. Evidence items
    evidence_data = [
        ('EVD-001', 'FIR-001', 'CCTV footage from shop #1', 'Digital Evidence', 'Evidence Room A'),
        ('EVD-002', 'FIR-001', 'Witness statements (3)', 'Document', 'Case File Room'),
        ('EVD-003', 'FIR-002', 'Medical report - victim', 'Document', 'Case File Room'),
        ('EVD-004', 'FIR-003', 'Recovered vehicle keys', 'Physical Evidence', 'Evidence Room B'),
        ('EVD-005', 'FIR-005', 'Bank transaction records', 'Digital Evidence', 'Digital Evidence Lab'),
    ]
    for evd_num, fir_num, desc, itype, location in evidence_data:
        evd, created = EvidenceItem.objects.get_or_create(
            item_number=evd_num,
            defaults={
                'fir': firs[fir_num],
                'description': desc,
                'item_type': itype,
                'storage_location': location,
            }
        )
        if created:
            EvidenceCustody.objects.create(
                evidence=evd,
                received_by=officers['OFF-002'],
                notes='Initial custody'
            )
    print(f'  Created evidence items')

    # 7. Attendance (last 7 days)
    today = date.today()
    for i in range(7):
        d = today - timedelta(days=i)
        for off in officers.values():
            Attendance.objects.get_or_create(
                officer=off, date=d,
                defaults={'status': 'PRESENT'}
            )
    # Some absences
    Attendance.objects.filter(officer=officers['OFF-006'], date=today - timedelta(days=2)).update(status='ABSENT')
    Attendance.objects.filter(officer=officers['OFF-004'], date=today - timedelta(days=1)).update(status='LEAVE')
    print(f'  Created attendance records')

    # 8. Leave requests
    LeaveRequest.objects.get_or_create(
        officer=officers['OFF-004'],
        leave_type='ANNUAL',
        start_date=today + timedelta(days=5),
        end_date=today + timedelta(days=9),
        defaults={'reason': 'Family vacation', 'status': 'PENDING'}
    )
    LeaveRequest.objects.get_or_create(
        officer=officers['OFF-007'],
        leave_type='SICK',
        start_date=today - timedelta(days=1),
        end_date=today + timedelta(days=2),
        defaults={'reason': 'Medical appointment', 'status': 'PENDING'}
    )
    LeaveRequest.objects.get_or_create(
        officer=officers['OFF-006'],
        leave_type='EMERGENCY',
        start_date=today + timedelta(days=3),
        end_date=today + timedelta(days=3),
        defaults={'reason': 'Family emergency', 'status': 'APPROVED', 'approved_by': users['admin']}
    )
    print(f'  Created leave requests')

    # 9. Duty assignments (today)
    duty_data = [
        ('OFF-003', 'MORNING', 'Bole Area'),
        ('OFF-006', 'MORNING', 'Merkato Area'),
        ('OFF-005', 'AFTERNOON', 'Piassa Area'),
        ('OFF-007', 'AFTERNOON', 'Bole Road'),
        ('OFF-003', 'NIGHT', 'City Center'),
    ]
    for off_badge, shift, location in duty_data:
        DutyAssignment.objects.get_or_create(
            officer=officers[off_badge],
            date=today,
            shift=shift,
            defaults={'location': location, 'assigned_by': users['admin']}
        )
    print(f'  Created duty assignments')

    # 10. Vehicles
    vehicles_data = [
        ('AA 001 AB', 'PATROL', 'Toyota', 'Hilux', 2022, 'AVAILABLE', 45000),
        ('AA 002 CD', 'PATROL', 'Toyota', 'Corolla', 2020, 'ASSIGNED', 62000),
        ('AA 003 EF', 'VAN', 'Ford', 'Transit', 2021, 'AVAILABLE', 38000),
        ('AA 004 GH', 'SUV', 'Toyota', 'Land Cruiser', 2023, 'MAINTENANCE', 15000),
        ('AA 005 IJ', 'MOTORCYCLE', 'Honda', 'CBR', 2021, 'AVAILABLE', 25000),
        ('AA 006 KL', 'PATROL', 'Nissan', 'Patrol', 2019, 'ASSIGNED', 78000),
    ]
    vehicles = {}
    for plate, vtype, make, model, year, status, mileage in vehicles_data:
        v, _ = Vehicle.objects.get_or_create(
            plate_number=plate,
            defaults={'vehicle_type': vtype, 'make': make, 'model': model, 'year': year, 'status': status, 'mileage': mileage}
        )
        vehicles[plate] = v
    print(f'  Created {len(vehicles)} vehicles')

    # 11. Vehicle assignments
    VehicleAssignment.objects.get_or_create(
        vehicle=vehicles['AA 002 CD'],
        officer=officers['OFF-002'],
        assigned_date=today - timedelta(days=30),
        defaults={'purpose': 'Patrol duties - Bole area', 'assigned_by': users['admin']}
    )
    VehicleAssignment.objects.get_or_create(
        vehicle=vehicles['AA 006 KL'],
        officer=officers['OFF-003'],
        assigned_date=today - timedelta(days=15),
        defaults={'purpose': 'Night patrol', 'assigned_by': users['admin']}
    )

    # 12. Fuel logs
    for plate in ['AA 001 AB', 'AA 002 CD', 'AA 006 KL']:
        for i in range(5):
            FuelLog.objects.get_or_create(
                vehicle=vehicles[plate],
                date=today - timedelta(days=i * 7),
                defaults={'liters': 45.0, 'odometer': 1000 + i * 500, 'cost': 3200.00, 'station': 'Shell Bole'}
            )
    print(f'  Created fuel logs')

    # 13. Equipment
    equipment_data = [
        ('Pistol Beretta M9', 'WPN-001', 'WEAPON', 'AVAILABLE'),
        ('Handcuffs Set', 'WPN-002', 'WEAPON', 'ASSIGNED'),
        ('Walkie-Talkie Motorola', 'COM-001', 'COMMUNICATION', 'AVAILABLE'),
        ('Radio Base Station', 'COM-002', 'COMMUNICATION', 'AVAILABLE'),
        ('Bulletproof Vest', 'PRT-001', 'PROTECTIVE', 'ASSIGNED'),
        ('Forensic Kit', 'FOR-001', 'FORENSIC', 'AVAILABLE'),
        ('Fingerprint Kit', 'FOR-002', 'FORENSIC', 'AVAILABLE'),
        ('Surveillance Camera', 'SRV-001', 'SURVEILLANCE', 'MAINTENANCE'),
        ('Evidence Bags (100)', 'OTH-001', 'OTHER', 'AVAILABLE'),
        ('Flashlight Set', 'OTH-002', 'OTHER', 'AVAILABLE'),
    ]
    for name, serial, cat, status in equipment_data:
        Equipment.objects.get_or_create(
            serial_number=serial,
            defaults={'item_name': name, 'category': cat, 'status': status}
        )
    print(f'  Created equipment items')

    print('Seed completed successfully!')
