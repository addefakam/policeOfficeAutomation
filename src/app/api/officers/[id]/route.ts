import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/officers/[id] - Get single officer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const officer = await db.officer.findUnique({
      where: { id },
      include: {
        attendances: { orderBy: { date: 'desc' } },
        leaveRequests: { orderBy: { createdAt: 'desc' } },
        dutyAssignments: { orderBy: { assignedDate: 'desc' } },
      },
    });

    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    return NextResponse.json(officer);
  } catch (error) {
    console.error('Error fetching officer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch officer' },
      { status: 500 }
    );
  }
}

// PUT /api/officers/[id] - Update officer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const officer = await db.officer.findUnique({ where: { id } });
    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    const updated = await db.officer.update({
      where: { id },
      data: {
        ...(body.badgeNumber !== undefined && { badgeNumber: body.badgeNumber }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.rank !== undefined && { rank: body.rank }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error updating officer:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Badge number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update officer' },
      { status: 500 }
    );
  }
}

// DELETE /api/officers/[id] - Delete officer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const officer = await db.officer.findUnique({ where: { id } });
    if (!officer) {
      return NextResponse.json({ error: 'Officer not found' }, { status: 404 });
    }

    await db.officer.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting officer:', error);
    return NextResponse.json(
      { error: 'Failed to delete officer' },
      { status: 500 }
    );
  }
}
