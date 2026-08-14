import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// POST /api/evidence - Add evidence item to a case
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const { firId, itemNumber, description, itemType, storageLocation } = body

    if (!firId || !itemNumber || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: firId, itemNumber, description' },
        { status: 400 }
      )
    }

    const { requireCaseAccess } = await import('@/lib/rbac')
    const access = await requireCaseAccess(request, firId, true)
    if (!access.allowed || access.error) return access.error!

    const evidence = await db.evidenceItem.create({
      data: {
        firId,
        itemNumber,
        description,
        itemType: itemType || 'Physical',
        storageLocation: storageLocation || 'Evidence Room',
      },
    })

    // Auto-create initial custody entry
    await db.evidenceCustody.create({
      data: {
        evidenceId: evidence.id,
        receivedBy: user!.name,
        locationTo: storageLocation || 'Evidence Room',
        purpose: 'Initial collection',
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'ADD_EVIDENCE',
      modelType: 'EvidenceItem',
      objectId: evidence.id,
      details: { firId, itemNumber, description, itemType },
      request,
    })

    return NextResponse.json({ success: true, data: evidence }, { status: 201 })
  } catch (error) {
    console.error('Error adding evidence:', error)
    return NextResponse.json({ error: 'Failed to add evidence' }, { status: 500 })
  }
}

// POST /api/evidence/transfer - Transfer evidence custody
export async function PUT(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const { evidenceId, releasedBy, locationFrom, locationTo, purpose, notes } = body

    if (!evidenceId || !locationTo) {
      return NextResponse.json(
        { error: 'Missing required fields: evidenceId, locationTo' },
        { status: 400 }
      )
    }

    // Verify evidence exists and user has access to its case
    const evidence = await db.evidenceItem.findUnique({ where: { id: evidenceId } })
    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    const { requireCaseAccess } = await import('@/lib/rbac')
    const access = await requireCaseAccess(request, evidence.firId, true)
    if (!access.allowed || access.error) return access.error!

    // Update evidence status
    await db.evidenceItem.update({
      where: { id: evidenceId },
      data: { status: locationTo === 'Evidence Room' ? 'In Storage' : 'With Investigator' },
    })

    // Create custody chain entry
    const custody = await db.evidenceCustody.create({
      data: {
        evidenceId,
        receivedBy: user!.name,
        releasedBy: releasedBy || user!.name,
        locationFrom: locationFrom || evidence.storageLocation,
        locationTo,
        purpose,
        notes,
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'TRANSFER_EVIDENCE',
      modelType: 'EvidenceCustody',
      objectId: custody.id,
      details: { evidenceId, itemNumber: evidence.itemNumber, locationFrom, locationTo, purpose },
      request,
    })

    return NextResponse.json({ success: true, data: custody }, { status: 201 })
  } catch (error) {
    console.error('Error transferring evidence:', error)
    return NextResponse.json({ error: 'Failed to transfer evidence' }, { status: 500 })
  }
}
