import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/duty-assignments - Get all duty assignments with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const officerId = searchParams.get('officerId');
    const dateParam = searchParams.get('date');
    const shiftType = searchParams.get('shiftType');

    const where: Record<string, unknown> = {};

    if (officerId) {
      where.officerId = officerId;
    }
    if (dateParam) {
      const dateStart = new Date(dateParam);
      const dateEnd = new Date(dateParam);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd.setHours(23, 59, 59, 999);
      where.assignedDate = {
        gte: dateStart,
        lte: dateEnd,
      };
    }
    if (shiftType) {
      where.shiftType = shiftType;
    }

    const assignments = await db.dutyAssignment.findMany({
      where,
      include: { officer: true },
      orderBy: { assignedDate: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching duty assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch duty assignments' },
      { status: 500 }
    );
  }
}

// POST /api/duty-assignments - Create duty assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { officerId, shiftType, postArea, assignedDate, startTime, endTime, createdBy } = body;

    if (!officerId || !assignedDate) {
      return NextResponse.json(
        { error: 'Missing required fields: officerId, assignedDate' },
        { status: 400 }
      );
    }

    // Verify officer exists
    const officer = await db.officer.findUnique({ where: { id: officerId } });
    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    const assignment = await db.dutyAssignment.create({
      data: {
        officerId,
        shiftType: shiftType || 'Day',
        postArea,
        assignedDate: new Date(assignedDate),
        startTime,
        endTime,
        createdBy,
      },
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating duty assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create duty assignment' },
      { status: 500 }
    );
  }
}
