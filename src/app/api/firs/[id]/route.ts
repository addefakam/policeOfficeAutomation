import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/firs/[id] - Get single FIR with investigation notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fir = await db.fIR.findUnique({
      where: { id },
      include: {
        investigationNotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 });
    }

    return NextResponse.json(fir);
  } catch (error) {
    console.error('Error fetching FIR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FIR' },
      { status: 500 }
    );
  }
}

// PUT /api/firs/[id] - Update FIR
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const fir = await db.fIR.findUnique({ where: { id } });
    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 });
    }

    const updated = await db.fIR.update({
      where: { id },
      data: {
        ...(body.firNumber !== undefined && { firNumber: body.firNumber }),
        ...(body.complainantName !== undefined && { complainantName: body.complainantName }),
        ...(body.complainantPhone !== undefined && { complainantPhone: body.complainantPhone }),
        ...(body.complainantAddress !== undefined && { complainantAddress: body.complainantAddress }),
        ...(body.incidentDate !== undefined && { incidentDate: new Date(body.incidentDate) }),
        ...(body.incidentLocation !== undefined && { incidentLocation: body.incidentLocation }),
        ...(body.crimeCategory !== undefined && { crimeCategory: body.crimeCategory }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.accusedNames !== undefined && { accusedNames: body.accusedNames }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.station !== undefined && { station: body.station }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error updating FIR:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'FIR number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update FIR' },
      { status: 500 }
    );
  }
}

// DELETE /api/firs/[id] - Delete FIR
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fir = await db.fIR.findUnique({ where: { id } });
    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 });
    }

    await db.fIR.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting FIR:', error);
    return NextResponse.json(
      { error: 'Failed to delete FIR' },
      { status: 500 }
    );
  }
}
