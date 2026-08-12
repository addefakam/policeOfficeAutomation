import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    // FIR counts by status
    const totalFIRs = await db.fIR.count();
    const openFIRs = await db.fIR.count({ where: { status: 'Open' } });
    const underInvestigationFIRs = await db.fIR.count({ where: { status: 'Under Investigation' } });
    const closedFIRs = await db.fIR.count({ where: { status: 'Closed' } });

    // Officer counts by status
    const totalOfficers = await db.officer.count();
    const activeOfficers = await db.officer.count({ where: { status: 'Active' } });
    const onLeaveOfficers = await db.officer.count({ where: { status: 'On Leave' } });

    // Vehicle counts by status
    const totalVehicles = await db.vehicle.count();
    const availableVehicles = await db.vehicle.count({ where: { status: 'Available' } });
    const assignedVehicles = await db.vehicle.count({ where: { status: 'Assigned' } });
    const maintenanceVehicles = await db.vehicle.count({ where: { status: 'Maintenance' } });

    // Equipment counts
    const totalEquipmentItems = await db.equipment.count();
    const equipmentNeedsAttention = await db.equipment.count({
      where: {
        OR: [
          { condition: 'Poor' },
          { condition: 'Needs Replacement' },
        ],
      },
    });

    // Recent FIRs (last 5)
    const recentFIRs = await db.fIR.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { investigationNotes: true },
    });

    // Crime by category using groupBy
    const crimeByCategoryRaw = await db.fIR.groupBy({
      by: ['crimeCategory'],
      _count: { crimeCategory: true },
    });
    const crimeByCategory = crimeByCategoryRaw.map((item) => ({
      category: item.crimeCategory,
      count: item._count.crimeCategory,
    }));

    // FIR by priority using groupBy
    const firByPriorityRaw = await db.fIR.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });
    const firByPriority = firByPriorityRaw.map((item) => ({
      priority: item.priority,
      count: item._count.priority,
    }));

    const dashboard = {
      // FIR Stats
      totalFIRs,
      openFIRs,
      underInvestigationFIRs,
      closedFIRs,

      // Officer Stats
      totalOfficers,
      activeOfficers,
      onLeaveOfficers,

      // Vehicle Stats
      totalVehicles,
      availableVehicles,
      assignedVehicles,
      maintenanceVehicles,

      // Equipment Stats
      totalEquipmentItems,
      equipmentNeedsAttention,

      // Recent Data
      recentFIRs,

      // Analytics
      crimeByCategory,
      firByPriority,
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
