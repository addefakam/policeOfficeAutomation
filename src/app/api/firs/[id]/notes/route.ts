import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/firs/[id]/notes - Add investigation note to FIR
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { officerName, note, actionTaken } = body;

    if (!officerName || !note) {
      return NextResponse.json(
        { error: 'Missing required fields: officerName, note' },
        { status: 400 }
      );
    }

    // Verify FIR exists
    const fir = await db.fIR.findUnique({ where: { id } });
    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 });
    }

    const investigationNote = await db.investigationNote.create({
      data: {
        firId: id,
        officerName,
        note,
        actionTaken,
      },
    });

    return NextResponse.json({ success: true, data: investigationNote }, { status: 201 });
  } catch (error) {
    console.error('Error creating investigation note:', error);
    return NextResponse.json(
      { error: 'Failed to create investigation note' },
      { status: 500 }
    );
  }
}
