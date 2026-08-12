import { db } from '../src/lib/db'

async function main() {
  // ===== SEED OFFICERS =====
  const officers = [
    { badgeNumber: 'P-1001', name: 'Officer Abebe Kebede', rank: 'Inspector', department: 'Investigations', phone: '0911223344' },
    { badgeNumber: 'P-1002', name: 'Officer Tigist Hailu', rank: 'Sergeant', department: 'General Patrol', phone: '0911556677' },
    { badgeNumber: 'P-1003', name: 'Officer Dawit Amare', rank: 'Constable', department: 'Traffic', phone: '0911889900' },
    { badgeNumber: 'P-1004', name: 'Officer Sara Mohammed', rank: 'Sergeant', department: 'Investigations', phone: '0911224466' },
    { badgeNumber: 'P-1005', name: 'Officer Yonas Tadesse', rank: 'Constable', department: 'General Patrol', phone: '0911335577' },
    { badgeNumber: 'P-1006', name: 'Officer Hanna Girma', rank: 'Inspector', department: 'Administration', phone: '0911446688' },
    { badgeNumber: 'P-1007', name: 'Officer Samuel Tesfaye', rank: 'Constable', department: 'Traffic', phone: '0911557799' },
    { badgeNumber: 'P-1008', name: 'Officer Mekdes Alemu', rank: 'Sergeant', department: 'General Patrol', phone: '0911668800' },
  ]

  const officerMap: Record<string, string> = {}
  for (const o of officers) {
    const created = await db.officer.upsert({ where: { badgeNumber: o.badgeNumber }, update: o, create: o })
    officerMap[o.badgeNumber] = created.id
  }

  // ===== SEED FIRs =====
  const firs = [
    { firNumber: 'FIR-2026-001', complainantName: 'Getachew Bekele', complainantPhone: '0922112233', complainantAddress: 'Bole Sub City, Woreda 03', incidentDate: new Date('2026-07-28T14:30:00'), incidentLocation: 'Bole Road, near Edna Mall', crimeCategory: 'Theft', description: 'Wallet containing cash and identification documents stolen from the complainant while boarding a public minibus.', accusedNames: 'Unknown male, approximately 25 years old', status: 'Under Investigation', assignedTo: 'Officer Abebe Kebede', priority: 'Medium', station: 'Bole Sub City Station' },
    { firNumber: 'FIR-2026-002', complainantName: 'Tigist Worku', complainantPhone: '0922334455', complainantAddress: 'Kirkos Sub City, Woreda 07', incidentDate: new Date('2026-08-01T22:15:00'), incidentLocation: 'Kazanchis area, Bambis Market', crimeCategory: 'Assault', description: 'The complainant was physically assaulted by a shop owner following a dispute over payment for goods.', accusedNames: 'Habtamu Alemayehu', status: 'Open', assignedTo: 'Officer Sara Mohammed', priority: 'High', station: 'Kirkos Sub City Station' },
    { firNumber: 'FIR-2026-003', complainantName: 'Dereje Alemayehu', complainantPhone: '0922556677', complainantAddress: 'Arada Sub City, Woreda 02', incidentDate: new Date('2026-08-03T08:00:00'), incidentLocation: 'Arada area, Mexico Square', crimeCategory: 'Vehicle Theft', description: 'Toyota Corolla license plate AA 12345 AB was stolen overnight from the complainant residence parking area.', accusedNames: 'Unknown', status: 'Under Investigation', assignedTo: 'Officer Abebe Kebede', priority: 'Critical', station: 'Arada Sub City Station' },
    { firNumber: 'FIR-2026-004', complainantName: 'Marta Tadesse', complainantPhone: '0922778899', complainantAddress: 'Yeka Sub City, Woreda 05', incidentDate: new Date('2026-08-05T16:45:00'), incidentLocation: 'Bologna area, near Sarbet', crimeCategory: 'Fraud', description: 'The complainant was defrauded of 50,000 ETB through an online shopping scam on social media platform.', accusedNames: 'Unknown - online seller using fake profile', status: 'Open', assignedTo: 'Officer Tigist Hailu', priority: 'Medium', station: 'Yeka Sub City Station' },
    { firNumber: 'FIR-2026-005', complainantName: 'Solomon Gebre', complainantPhone: '0922990011', complainantAddress: 'Lideta Sub City, Woreda 01', incidentDate: new Date('2026-08-07T11:20:00'), incidentLocation: 'Lideta area, Merkato Market', crimeCategory: 'Robbery', description: 'Armed robbery at a small business establishment. Three armed men took cash and electronics from the shop.', accusedNames: 'Three unknown males, armed', status: 'Under Investigation', assignedTo: 'Officer Sara Mohammed', priority: 'Critical', station: 'Lideta Sub City Station' },
    { firNumber: 'FIR-2026-006', complainantName: 'Alem Feyissa', complainantPhone: '0922113344', complainantAddress: 'Nefas Silk-Lafto, Woreda 04', incidentDate: new Date('2026-08-09T19:00:00'), incidentLocation: 'Wossen area, main street', crimeCategory: 'Vandalism', description: 'The complainant reported damage to their vehicle parked on the street. Side windows broken and personal items taken.', accusedNames: 'Unknown', status: 'Closed', assignedTo: 'Officer Dawit Amare', priority: 'Low', station: 'Nefas Silk-Lafto Station' },
    { firNumber: 'FIR-2026-007', complainantName: 'Hiwot Derso', complainantPhone: '0922335566', complainantAddress: 'Kolfe Keranyo, Woreda 06', incidentDate: new Date('2026-08-10T07:30:00'), incidentLocation: 'Kolfe area, behind Kotebe College', crimeCategory: 'Domestic Violence', description: 'Report of repeated domestic abuse. The complainant sought police intervention after a physical altercation.', accusedNames: 'Withheld per victim request', status: 'Open', assignedTo: 'Officer Mekdes Alemu', priority: 'High', station: 'Kolfe Keranyo Station' },
    { firNumber: 'FIR-2026-008', complainantName: 'Biruk Assefa', complainantPhone: '0922557799', complainantAddress: 'Akaki Kality, Woreda 08', incidentDate: new Date('2026-08-11T13:00:00'), incidentLocation: 'Akaki area, industrial zone road', crimeCategory: 'Theft', description: 'Construction materials (iron bars, cement bags) stolen from a building site during the night.', accusedNames: 'Unknown', status: 'Open', assignedTo: 'Officer Yonas Tadesse', priority: 'Medium', station: 'Akaki Kality Station' },
  ]

  for (const f of firs) {
    await db.fIR.upsert({ where: { firNumber: f.firNumber }, update: f, create: f })
  }

  // ===== SEED INVESTIGATION NOTES =====
  const notes = [
    { firId: 'FIR-2026-001', officerName: 'Officer Abebe Kebede', note: 'Visited the incident location and interviewed witnesses at the minibus stop. Two witnesses confirmed seeing a suspicious individual.', actionTaken: 'Collected witness statements; requested CCTV footage from nearby shops' },
    { firId: 'FIR-2026-002', officerName: 'Officer Sara Mohammed', note: 'Complainant provided medical examination report confirming injuries. Suspect identified and located.', actionTaken: 'Suspect summoned for questioning; complaint file forwarded to prosecutor' },
    { firId: 'FIR-2026-003', officerName: 'Officer Abebe Kebede', note: 'Vehicle description and registration shared with all patrol units. Checkpoint alerts issued on major exit routes.', actionTaken: 'Alert broadcast to all stations; checking nearby parking garages' },
    { firId: 'FIR-2026-005', officerName: 'Officer Sara Mohammed', note: 'Crime scene processed. Fingerprints lifted from counter and door handle. Two spent cartridges recovered.', actionTaken: 'Evidence sent to forensic lab; area canvass for additional witnesses' },
    { firId: 'FIR-2026-006', officerName: 'Officer Dawit Amare', note: 'Investigation concluded. Suspect identified as a minor. Case referred to juvenile rehabilitation program per procedures.', actionTaken: 'Case closed and referred to social services' },
  ]

  for (const n of notes) {
    const fir = await db.fIR.findUnique({ where: { firNumber: n.firId } })
    if (fir) {
      await db.investigationNote.upsert({
        where: { id: `${fir.id}-${n.officerName}`.replace(/[^a-zA-Z0-9]/g, '') || `note-${Date.now()}-${Math.random()}` },
        update: n,
        create: { ...n, firId: fir.id },
      })
    }
  }

  // ===== SEED VEHICLES =====
  const vehicles = [
    { registrationNumber: 'GOV-PD-001', make: 'Toyota', model: 'Land Cruiser', year: 2022, vehicleType: 'Patrol Car', status: 'Available', insuranceExpiry: new Date('2027-01-15'), lastServiceDate: new Date('2026-07-01'), nextServiceDate: new Date('2026-10-01'), currentMileage: 34500 },
    { registrationNumber: 'GOV-PD-002', make: 'Toyota', model: 'Hilux Pickup', year: 2020, vehicleType: 'Patrol Car', status: 'Assigned', insuranceExpiry: new Date('2026-12-20'), lastServiceDate: new Date('2026-06-15'), nextServiceDate: new Date('2026-09-15'), currentMileage: 52300 },
    { registrationNumber: 'GOV-PD-003', make: 'Nissan', model: 'Patrol Van', year: 2019, vehicleType: 'Prisoner Transport', status: 'Maintenance', insuranceExpiry: new Date('2027-03-10'), lastServiceDate: new Date('2026-08-01'), nextServiceDate: new Date('2026-11-01'), currentMileage: 78200 },
    { registrationNumber: 'GOV-PD-004', make: 'Toyota', model: 'Corolla', year: 2021, vehicleType: 'Administrative', status: 'Available', insuranceExpiry: new Date('2027-02-28'), lastServiceDate: new Date('2026-07-20'), nextServiceDate: new Date('2026-10-20'), currentMileage: 28900 },
    { registrationNumber: 'GOV-PD-005', make: 'Honda', model: 'CBR Motorcycle', year: 2023, vehicleType: 'Motorcycle', status: 'Assigned', insuranceExpiry: new Date('2027-06-01'), lastServiceDate: new Date('2026-07-10'), nextServiceDate: new Date('2026-08-10'), currentMileage: 8500 },
  ]

  const vehicleMap: Record<string, string> = {}
  for (const v of vehicles) {
    const created = await db.vehicle.upsert({ where: { registrationNumber: v.registrationNumber }, update: v, create: v })
    vehicleMap[v.registrationNumber] = created.id
  }

  // ===== SEED EQUIPMENT =====
  const equipment = [
    { itemCode: 'EQ-001', name: 'VHF Handheld Radio', category: 'Communication', quantity: 20, availableQty: 16, condition: 'Good', storageLocation: 'Equipment Room A' },
    { itemCode: 'EQ-002', name: 'Bulletproof Vest', category: 'Protective Gear', quantity: 15, availableQty: 14, condition: 'Good', storageLocation: 'Armory' },
    { itemCode: 'EQ-003', name: 'Metal Detector', category: 'Detection Equipment', quantity: 5, availableQty: 4, condition: 'Good', storageLocation: 'Equipment Room B' },
    { itemCode: 'EQ-004', name: 'Breathalyzer', category: 'Traffic Equipment', quantity: 8, availableQty: 6, condition: 'Fair', storageLocation: 'Traffic Office' },
    { itemCode: 'EQ-005', name: 'Digital Camera', category: 'Forensic Equipment', quantity: 4, availableQty: 3, condition: 'Good', storageLocation: 'Investigation Office' },
    { itemCode: 'EQ-006', name: 'Barricade Set', category: 'Crowd Control', quantity: 10, availableQty: 10, condition: 'Good', storageLocation: 'Storage Yard' },
    { itemCode: 'EQ-007', name: 'First Aid Kit', category: 'Medical', quantity: 12, availableQty: 9, condition: 'Good', storageLocation: 'Medical Room' },
    { itemCode: 'EQ-008', name: 'Flashlight (Rechargeable)', category: 'General Equipment', quantity: 30, availableQty: 25, condition: 'Fair', storageLocation: 'Equipment Room A' },
  ]

  for (const e of equipment) {
    await db.equipment.upsert({ where: { itemCode: e.itemCode }, update: e, create: e })
  }

  // ===== SEED ATTENDANCE (last 7 days) =====
  const today = new Date()
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    for (const o of officers) {
      const isAbsent = Math.random() < 0.08
      const isHalfDay = !isAbsent && Math.random() < 0.05
      const status = isAbsent ? 'Absent' : isHalfDay ? 'Half Day' : 'Present'
      const checkIn = !isAbsent ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)) : null
      const checkOut = !isAbsent ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)) : null
      const hoursWorked = checkIn && checkOut ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 10) / 10 : 0
      
      await db.attendance.create({
        data: { officerId: officerMap[o.badgeNumber], date, checkIn, checkOut, hoursWorked, status }
      })
    }
  }

  // ===== SEED DUTY ASSIGNMENTS (this week) =====
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const shifts = ['Day', 'Night', 'Patrol']
  const posts = ['Bole Area', 'Merkato Area', 'Kazanchis Area', 'Mexico Area', 'Piassa Area']
  
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + d)
    if (date > today) break
    
    for (let i = 0; i < officers.length; i++) {
      const shift = shifts[i % 3]
      const post = posts[i % posts.length]
      await db.dutyAssignment.create({
        data: {
          officerId: officerMap[officers[i].badgeNumber],
          shiftType: shift,
          postArea: post,
          assignedDate: date,
          startTime: shift === 'Day' ? '06:00' : shift === 'Night' ? '18:00' : '08:00',
          endTime: shift === 'Day' ? '14:00' : shift === 'Night' ? '06:00' : '16:00',
          createdBy: 'Officer Hanna Girma',
        }
      })
    }
  }

  // ===== SEED LEAVE REQUESTS =====
  const leaves = [
    { officerId: officerMap['P-1003'], leaveType: 'Sick', startDate: new Date('2026-08-05'), endDate: new Date('2026-08-06'), days: 2, reason: 'Medical appointment and recovery', status: 'Approved', approvedBy: 'Officer Hanna Girma' },
    { officerId: officerMap['P-1005'], leaveType: 'Annual', startDate: new Date('2026-08-20'), endDate: new Date('2026-08-25'), days: 6, reason: 'Family vacation', status: 'Pending' },
    { officerId: officerMap['P-1007'], leaveType: 'Emergency', startDate: new Date('2026-08-08'), endDate: new Date('2026-08-08'), days: 1, reason: 'Family emergency', status: 'Approved', approvedBy: 'Officer Hanna Girma' },
    { officerId: officerMap['P-1001'], leaveType: 'Annual', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-10'), days: 10, reason: 'Personal travel', status: 'Pending' },
  ]

  for (const l of leaves) {
    await db.leaveRequest.upsert({
      where: { id: `leave-${l.officerId}-${l.startDate.toISOString().split('T')[0]}` },
      update: l,
      create: { ...l, id: `leave-${l.officerId}-${l.startDate.toISOString().split('T')[0]}` },
    })
  }

  // ===== SEED VEHICLE ASSIGNMENTS & FUEL LOGS =====
  const vAssignments = [
    { vehicleId: vehicleMap['GOV-PD-002'], officerName: 'Officer Tigist Hailu', officerBadge: 'P-1002', purpose: 'Evening patrol duty - Bole area', assignedDate: new Date('2026-08-10'), status: 'Assigned' },
    { vehicleId: vehicleMap['GOV-PD-005'], officerName: 'Officer Dawit Amare', officerBadge: 'P-1003', purpose: 'Traffic enforcement - main roads', assignedDate: new Date('2026-08-11'), status: 'Assigned' },
  ]

  for (const va of vAssignments) {
    await db.vehicleAssignment.create({ data: { id: `va-${va.vehicleId}-${Date.now()}`, ...va } })
  }

  const fuelLogs = [
    { vehicleId: vehicleMap['GOV-PD-001'], date: new Date('2026-08-01'), fuelType: 'Diesel', liters: 60, cost: 5400, mileage: 34200, filledBy: 'Officer Yonas Tadesse' },
    { vehicleId: vehicleMap['GOV-PD-002'], date: new Date('2026-08-03'), fuelType: 'Diesel', liters: 55, cost: 4950, mileage: 52000, filledBy: 'Officer Samuel Tesfaye' },
    { vehicleId: vehicleMap['GOV-PD-004'], date: new Date('2026-08-05'), fuelType: 'Petrol', liters: 40, cost: 3600, mileage: 28600, filledBy: 'Officer Yonas Tadesse' },
    { vehicleId: vehicleMap['GOV-PD-001'], date: new Date('2026-08-08'), fuelType: 'Diesel', liters: 58, cost: 5220, mileage: 34400, filledBy: 'Officer Tigist Hailu' },
  ]

  for (const fl of fuelLogs) {
    await db.fuelLog.create({ data: { id: `fuel-${Date.now()}-${Math.random()}`, ...fl } })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
