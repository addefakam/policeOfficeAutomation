import { db } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/attendance - Get all attendance records with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const { searchParams } = request.nextUrl;
    const officerId = searchParams.get('officerId');
    const dateParam = searchParams.get('date');

    const where: Record<string, unknown> = {};

    if (officerId) {
      where.officerId = officerId;
    }
    if (dateParam) {
      const dateStart = new Date(dateParam);
      const dateEnd = new Date(dateParam);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd.setHours(23, 59, 59, 999);
      where.date = {
        gte: dateStart,
        lte: dateEnd,
      };
    }

    const attendance = await db.attendance.findMany({
      where,
      include: { officer: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

// POST /api/attendance - Create attendance record (check-in)
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const body = await request.json();

    const { officerId, date, status: attendanceStatus, notes } = body;

    if (!officerId) {
      return NextResponse.json(
        { error: 'Missing required field: officerId' },
        { status: 400 }
      );
    }

    // Verify officer exists
    const officer = await db.officer.findUnique({ where: { id: officerId } });
    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    const now = new Date();
    const recordDate = date ? new Date(date) : now;

    const attendance = await db.attendance.create({
      data: {
        officerId,
        date: recordDate,
        checkIn: now,
        status: attendanceStatus || 'Present',
        notes,
      },
    });

    return NextResponse.json({ success: true, data: attendance }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    );
  }
}

// PUT /api/attendance - Check-out (accept { officerId, date })
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { officerId, date } = body;

    if (!officerId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: officerId, date' },
        { status: 400 }
      );
    }

    const dateStart = new Date(date);
    const dateEnd = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    dateEnd.setHours(23, 59, 59, 999);

    const attendance = await db.attendance.findFirst({
      where: {
        officerId,
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json(
        { error: 'No attendance record found for this officer and date' },
        { status: 404 }
      );
    }

    const checkOutTime = new Date();
    const hoursWorked = attendance.checkIn
      ? (checkOutTime.getTime() - new Date(attendance.checkIn).getTime()) / (1000 * 60 * 60)
      : 0;

    const updated = await db.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: checkOutTime,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to check out' },
      { status: 500 }
    );
  }
}
