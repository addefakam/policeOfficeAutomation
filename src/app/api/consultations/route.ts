import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// GET /api/consultations - Get consultation requests (for current user)
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'sent' or 'received'

    const where: Record<string, unknown> = {}

    if (type === 'sent') {
      where.requestorId = user!.id
    } else if (type === 'received') {
      where.responderId = user!.id
    } else {
      where.OR = [{ requestorId: user!.id }, { responderId: user!.id }]
    }

    if (status) where.status = status

    const consultations = await db.consultationRequest.findMany({
      where,
      include: {
        fir: { select: { firNumber: true, complainantName: true, crimeCategory: true, status: true } },
        requestor: { select: { username: true, role: true, officer: { select: { name: true } } } },
        responder: { select: { username: true, role: true, officer: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(consultations)
  } catch (error) {
    console.error('Error fetching consultations:', error)
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 })
  }
}

// POST /api/consultations - Request consultation access to a case
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const { firId, reason } = body

    if (!firId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: firId, reason' },
        { status: 400 }
      )
    }

    // Find the case
    const fir = await db.fIR.findUnique({ where: { id: firId } })
    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 })
    }

    // Find the assigned investigator's user account
    const assignedUser = await db.user.findFirst({
      where: { officer: { name: fir.assignedTo } },
    })

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Cannot find assigned investigator account for this case' },
        { status: 400 }
      )
    }

    // Can't request consultation on your own case
    if (assignedUser.id === user!.id) {
      return NextResponse.json(
        { error: 'You already have access to this case' },
        { status: 400 }
      )
    }

    // Check for existing pending request
    const existingPending = await db.consultationRequest.findFirst({
      where: {
        firId,
        requestorId: user!.id,
        status: 'Pending',
      },
    })
    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending consultation request for this case' },
        { status: 409 }
      )
    }

    // Consultation expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const consultation = await db.consultationRequest.create({
      data: {
        firId,
        requestorId: user!.id,
        responderId: assignedUser.id,
        reason,
        status: 'Pending',
        expiresAt,
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'REQUEST_CONSULTATION',
      modelType: 'ConsultationRequest',
      objectId: consultation.id,
      details: { firId, firNumber: fir.firNumber, reason, responder: assignedUser.username },
      request,
    })

    return NextResponse.json({ success: true, data: consultation }, { status: 201 })
  } catch (error) {
    console.error('Error creating consultation request:', error)
    return NextResponse.json({ error: 'Failed to create consultation request' }, { status: 500 })
  }
}

// PATCH /api/consultations - Approve or reject a consultation request
export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const { id, status: newStatus, responseNote } = body

    if (!id || !newStatus || !['Approved', 'Rejected'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status (Approved/Rejected)' },
        { status: 400 }
      )
    }

    const consultation = await db.consultationRequest.findUnique({
      where: { id },
      include: { fir: true },
    })
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 })
    }

    // Only the responder (assigned investigator) or commander+ can approve/reject
    if (consultation.responderId !== user!.id) {
      const { hasMinRole } = await import('@/lib/auth')
      if (!hasMinRole(user!.role, 'STATION_COMMANDER')) {
        return NextResponse.json(
          { error: 'Only the assigned investigator or commander can respond to this request' },
          { status: 403 }
        )
      }
    }

    if (consultation.status !== 'Pending') {
      return NextResponse.json(
        { error: 'This request has already been ' + consultation.status.toLowerCase() },
        { status: 400 }
      )
    }

    const updated = await db.consultationRequest.update({
      where: { id },
      data: {
        status: newStatus,
        grantedAt: newStatus === 'Approved' ? new Date() : null,
        respondedAt: new Date(),
        responseNote,
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: newStatus === 'Approved' ? 'APPROVE_CONSULTATION' : 'REJECT_CONSULTATION',
      modelType: 'ConsultationRequest',
      objectId: id,
      details: {
        firNumber: consultation.fir.firNumber,
        requestor: consultation.requestorId,
        decision: newStatus,
        responseNote,
      },
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating consultation:', error)
    return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 })
  }
}
