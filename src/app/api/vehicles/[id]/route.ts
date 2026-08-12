import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/vehicles/[id] - Get single vehicle with assignments and fuel logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        assignments: { orderBy: { assignedDate: 'desc' } },
        fuelLogs: { orderBy: { date: 'desc' } },
        maintenanceLogs: { orderBy: { performedDate: 'desc' } },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const updated = await db.vehicle.update({
      where: { id },
      data: {
        ...(body.registrationNumber !== undefined && { registrationNumber: body.registrationNumber }),
        ...(body.make !== undefined && { make: body.make }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.year !== undefined && { year: body.year }),
        ...(body.vehicleType !== undefined && { vehicleType: body.vehicleType }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.insuranceExpiry !== undefined && {
          insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
        }),
        ...(body.lastServiceDate !== undefined && {
          lastServiceDate: body.lastServiceDate ? new Date(body.lastServiceDate) : null,
        }),
        ...(body.nextServiceDate !== undefined && {
          nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
        }),
        ...(body.currentMileage !== undefined && { currentMileage: body.currentMileage }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error updating vehicle:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Registration number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    await db.vehicle.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}
