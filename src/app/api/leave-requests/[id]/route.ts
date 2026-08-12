import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/leave-requests/[id] - Update leave request (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status, approvedBy } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be Approved, Rejected, or Pending' },
        { status: 400 }
      );
    }

    const leaveRequest = await db.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        ...(approvedBy !== undefined && { approvedBy }),
      },
      include: { officer: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { error: 'Failed to update leave request' },
      { status: 500 }
    );
  }
}

// DELETE /api/leave-requests/[id] - Delete leave request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leaveRequest = await db.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    await db.leaveRequest.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave request' },
      { status: 500 }
    );
  }
}
