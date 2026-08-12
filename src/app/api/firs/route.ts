import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/firs - Get all FIRs with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firNumber: { contains: search } },
        { complainantName: { contains: search } },
        { incidentLocation: { contains: search } },
        { description: { contains: search } },
        { accusedNames: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (category) {
      where.crimeCategory = category;
    }
    if (priority) {
      where.priority = priority;
    }

    const firs = await db.fIR.findMany({
      where,
      include: { investigationNotes: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(firs);
  } catch (error) {
    console.error('Error fetching FIRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FIRs' },
      { status: 500 }
    );
  }
}

// POST /api/firs - Create a new FIR
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      firNumber,
      complainantName,
      complainantPhone,
      complainantAddress,
      incidentDate,
      incidentLocation,
      crimeCategory,
      description,
      accusedNames,
      status,
      assignedTo,
      priority,
      station,
    } = body;

    if (!firNumber || !complainantName || !incidentDate || !incidentLocation || !crimeCategory || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: firNumber, complainantName, incidentDate, incidentLocation, crimeCategory, description' },
        { status: 400 }
      );
    }

    const fir = await db.fIR.create({
      data: {
        firNumber,
        complainantName,
        complainantPhone,
        complainantAddress,
        incidentDate: new Date(incidentDate),
        incidentLocation,
        crimeCategory,
        description,
        accusedNames,
        status: status || 'Open',
        assignedTo,
        priority: priority || 'Medium',
        station: station || 'Main Station',
      },
    });

    return NextResponse.json({ success: true, data: fir }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating FIR:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'FIR number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create FIR' },
      { status: 500 }
    );
  }
}
