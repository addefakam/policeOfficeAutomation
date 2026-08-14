import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireCaseAccess } from '@/lib/rbac'
import { hasMinRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/firs/[id] - Get single FIR (with need-to-know check)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireCaseAccess(request, id)
    if (!access.allowed || access.error) return access.error!

    await logAudit({
      userId: access.user.id,
      username: access.user.username,
      action: 'VIEW_CASE',
      modelType: 'FIR',
      objectId: id,
      details: { firNumber: access.fir!.firNumber },
      request,
    })

    return NextResponse.json(access.fir)
  } catch (error) {
    console.error('Error fetching FIR:', error)
    return NextResponse.json({ error: 'Failed to fetch FIR' }, { status: 500 })
  }
}

// PUT /api/firs/[id] - Update FIR (only case owner or commander+)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireCaseAccess(request, id, true) // requireWrite = true
    if (!access.allowed || access.error) return access.error!

    const body = await request.json()

    // Track status changes for audit
    const oldFir = access.fir!
    const changes: Record<string, { from: unknown; to: unknown }> = {}

    const updateData: Record<string, unknown> = {}
    const updatableFields = ['firNumber', 'complainantName', 'complainantPhone', 'complainantAddress',
      'incidentDate', 'incidentLocation', 'crimeCategory', 'description', 'accusedNames',
      'status', 'assignedTo', 'priority', 'station']

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'status' && body[field] !== oldFir.status) {
          changes.status = { from: oldFir.status, to: body[field] }
        }
        if (field === 'assignedTo' && body[field] !== oldFir.assignedTo) {
          changes.assignedTo = { from: oldFir.assignedTo, to: body[field] }
        }
        if (field === 'incidentDate') {
          updateData[field] = new Date(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.fIR.update({
      where: { id },
      data: updateData,
    })

    // Determine specific audit action
    let auditAction = 'EDIT_CASE'
    if (changes.assignedTo) auditAction = 'TRANSFER_CASE'
    if (changes.status?.to === 'Closed') auditAction = 'CLOSE_CASE'

    await logAudit({
      userId: access.user.id,
      username: access.user.username,
      action: auditAction as any,
      modelType: 'FIR',
      objectId: id,
      details: { firNumber: oldFir.firNumber, changes },
      request,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Error updating FIR:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'FIR number already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update FIR' }, { status: 500 })
  }
}

// DELETE /api/firs/[id] - Delete FIR (ADMIN ONLY — dangerous operation)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Only admins can delete cases
    const sessionUser = await (await import('@/lib/rbac')).requireRole(request, 'ADMIN')
    if (sessionUser.error) return sessionUser.error
    const user = sessionUser.user!

    const fir = await db.fIR.findUnique({ where: { id } })
    if (!fir) {
      return NextResponse.json({ error: 'FIR not found' }, { status: 404 })
    }

    await db.fIR.delete({ where: { id } })

    await logAudit({
      userId: user.id,
      username: user.username,
      action: 'DELETE_CASE',
      modelType: 'FIR',
      objectId: id,
      details: { firNumber: fir.firNumber, complainantName: fir.complainantName, crimeCategory: fir.crimeCategory },
      request,
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error deleting FIR:', error)
    return NextResponse.json({ error: 'Failed to delete FIR' }, { status: 500 })
  }
}
