import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/vehicles/[id]/fuel - Get fuel logs for a vehicle
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

    const fuelLogs = await db.fuelLog.findMany({
      where: { vehicleId: id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(fuelLogs);
  } catch (error) {
    console.error('Error fetching fuel logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fuel logs' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles/[id]/fuel - Add fuel log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { date, fuelType, liters, cost, mileage, filledBy } = body;

    if (!date || liters === undefined || liters === null) {
      return NextResponse.json(
        { error: 'Missing required fields: date, liters' },
        { status: 400 }
      );
    }

    // Verify vehicle exists
    const vehicle = await db.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const fuelLog = await db.fuelLog.create({
      data: {
        vehicleId: id,
        date: new Date(date),
        fuelType: fuelType || 'Diesel',
        liters: parseFloat(String(liters)),
        cost: cost !== undefined ? parseFloat(String(cost)) : undefined,
        mileage: mileage !== undefined ? parseInt(String(mileage), 10) : undefined,
        filledBy,
      },
    });

    // Update vehicle mileage if provided and greater than current
    if (mileage !== undefined && mileage > vehicle.currentMileage) {
      await db.vehicle.update({
        where: { id },
        data: { currentMileage: mileage },
      });
    }

    return NextResponse.json({ success: true, data: fuelLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating fuel log:', error);
    return NextResponse.json(
      { error: 'Failed to create fuel log' },
      { status: 500 }
    );
  }
}
