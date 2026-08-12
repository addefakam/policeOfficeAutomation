import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/leave-requests - Get all leave requests with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const officerId = searchParams.get('officerId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (officerId) {
      where.officerId = officerId;
    }
    if (status) {
      where.status = status;
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where,
      include: { officer: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leaveRequests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

// POST /api/leave-requests - Create leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { officerId, leaveType, startDate, endDate, days, reason } = body;

    if (!officerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: officerId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Verify officer exists
    const officer = await db.officer.findUnique({ where: { id: officerId } });
    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        officerId,
        leaveType: leaveType || 'Annual',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        reason,
        status: 'Pending',
      },
    });

    return NextResponse.json({ success: true, data: leaveRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}
