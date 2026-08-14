import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCaseAccess } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// POST /api/firs/[id]/notes - Add investigation note (append-only, immutable)
// NO GET, PUT, or DELETE — notes cannot be retrieved individually, edited, or removed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireCaseAccess(request, id, true) // requireWrite = true
    if (!access.allowed || access.error) return access.error!

    const body = await request.json()
    const { note, actionTaken } = body

    if (!note) {
      return NextResponse.json(
        { error: 'Missing required field: note' },
        { status: 400 }
      )
    }

    // officerName is automatically set from the logged-in user — not from client input
    const officerName = access.user.name
    const userId = access.user.id

    const investigationNote = await db.investigationNote.create({
      data: {
        firId: id,
        userId,
        officerName,
        note,
        actionTaken,
      },
    })

    await logAudit({
      userId,
      username: access.user.username,
      action: 'ADD_NOTE',
      modelType: 'InvestigationNote',
      objectId: investigationNote.id,
      details: {
        firId: id,
        firNumber: access.fir!.firNumber,
        notePreview: note.substring(0, 100) + (note.length > 100 ? '...' : ''),
        actionTaken,
      },
      request,
    })

    return NextResponse.json({ success: true, data: investigationNote }, { status: 201 })
  } catch (error) {
    console.error('Error creating investigation note:', error)
    return NextResponse.json(
      { error: 'Failed to create investigation note' },
      { status: 500 }
    )
  }
}
