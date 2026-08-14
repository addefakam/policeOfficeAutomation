import { db } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/vehicles - Get all vehicles
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const vehicles = await db.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create a new vehicle
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const body = await request.json();

    const {
      registrationNumber,
      make,
      model,
      year,
      vehicleType,
      status,
      insuranceExpiry,
      lastServiceDate,
      nextServiceDate,
      currentMileage,
      notes,
    } = body;

    if (!registrationNumber || !make || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: registrationNumber, make, model' },
        { status: 400 }
      );
    }

    const vehicle = await db.vehicle.create({
      data: {
        registrationNumber,
        make,
        model,
        year,
        vehicleType: vehicleType || 'Patrol Car',
        status: status || 'Available',
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
        lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : undefined,
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : undefined,
        currentMileage: currentMileage || 0,
        notes,
      },
    });

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating vehicle:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Registration number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
