import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request);
    if (error) return error;

    // FIR counts — investigators only see their own cases
    const firWhere: Record<string, unknown> = {};
    if (user!.role === 'INVESTIGATOR') {
      const teamCaseIds = await db.caseTeamMember.findMany({
        where: { userId: user!.id },
        select: { firId: true },
      });
      firWhere.OR = [
        { assignedTo: user!.name },
        ...(teamCaseIds.length > 0 ? [{ id: { in: teamCaseIds.map(t => t.firId) } }] : []),
      ];
    }

    const totalFIRs = await db.fIR.count({ where: Object.keys(firWhere).length > 0 ? firWhere : undefined });
    const openFIRs = await db.fIR.count({ where: { ...firWhere, status: 'Open' } });
    const underInvestigationFIRs = await db.fIR.count({ where: { ...firWhere, status: 'Under Investigation' } });
    const closedFIRs = await db.fIR.count({ where: { ...firWhere, status: 'Closed' } });

    const totalOfficers = await db.officer.count();
    const activeOfficers = await db.officer.count({ where: { status: 'Active' } });
    const onLeaveOfficers = await db.officer.count({ where: { status: 'On Leave' } });

    const totalVehicles = await db.vehicle.count();
    const availableVehicles = await db.vehicle.count({ where: { status: 'Available' } });
    const assignedVehicles = await db.vehicle.count({ where: { status: 'Assigned' } });
    const maintenanceVehicles = await db.vehicle.count({ where: { status: 'Maintenance' } });

    const totalEquipmentItems = await db.equipment.count();
    const equipmentNeedsAttention = await db.equipment.count({
      where: {
        OR: [
          { condition: 'Poor' },
          { condition: 'Needs Replacement' },
        ],
      },
    });

    // Pending consultations for the current user
    const pendingConsultations = user!.role !== 'CLERK' ? await db.consultationRequest.count({
      where: {
        responderId: user!.id,
        status: 'Pending',
      },
    }) : 0;

    const recentFIRs = await db.fIR.findMany({
      where: Object.keys(firWhere).length > 0 ? firWhere : undefined,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { investigationNotes: true },
    });

    const crimeByCategoryRaw = await db.fIR.groupBy({
      by: ['crimeCategory'],
      _count: { crimeCategory: true },
      where: Object.keys(firWhere).length > 0 ? firWhere : undefined,
    });
    const crimeByCategory = crimeByCategoryRaw.map((item) => ({
      category: item.crimeCategory,
      count: item._count.crimeCategory,
    }));

    const firByPriorityRaw = await db.fIR.groupBy({
      by: ['priority'],
      _count: { priority: true },
      where: Object.keys(firWhere).length > 0 ? firWhere : undefined,
    });
    const firByPriority = firByPriorityRaw.map((item) => ({
      priority: item.priority,
      count: item._count.priority,
    }));

    return NextResponse.json({
      totalFIRs, openFIRs, underInvestigationFIRs, closedFIRs,
      totalOfficers, activeOfficers, onLeaveOfficers,
      totalVehicles, availableVehicles, assignedVehicles, maintenanceVehicles,
      totalEquipmentItems, equipmentNeedsAttention,
      pendingConsultations,
      recentFIRs,
      crimeByCategory, firByPriority,
      currentUser: {
        id: user!.id,
        username: user!.username,
        role: user!.role,
        name: user!.name,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 });
  }
}