import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/vehicles/[id]/assignments - Get assignments for a vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const assignments = await db.vehicleAssignment.findMany({
      where: { vehicleId: id },
      orderBy: { assignedDate: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching vehicle assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle assignments' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles/[id]/assignments - Create assignment for vehicle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { officerName, officerBadge, purpose, assignedDate } = body;

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const assignment = await db.vehicleAssignment.create({
      data: {
        vehicleId: id,
        officerName,
        officerBadge,
        purpose,
        assignedDate: assignedDate ? new Date(assignedDate) : new Date(),
        status: 'Assigned',
      },
    });

    // Update vehicle status to Assigned
    await db.vehicle.update({
      where: { id },
      data: { status: 'Assigned' },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle assignment' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id]/assignments - Return vehicle (accept { id })
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const body = await request.json();
    const { id: assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing required field: id (assignment id)' },
        { status: 400 }
      );
    }

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Find the assignment
    const assignment = await db.vehicleAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.vehicleId !== vehicleId) {
      return NextResponse.json(
        { error: 'Assignment not found for this vehicle' },
        { status: 404 }
      );
    }

    const now = new Date();
    const updated = await db.vehicleAssignment.update({
      where: { id: assignmentId },
      data: {
        returnDate: now,
        status: 'Returned',
      },
    });

    // Check if there are any other active assignments for this vehicle
    const activeAssignments = await db.vehicleAssignment.count({
      where: {
        vehicleId,
        status: 'Assigned',
        id: { not: assignmentId },
      },
    });

    // If no more active assignments, set vehicle to Available
    if (activeAssignments === 0) {
      await db.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'Available' },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error returning vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to return vehicle' },
      { status: 500 }
    );
  }
}
