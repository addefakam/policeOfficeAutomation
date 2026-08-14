import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// POST /api/case-team - Add a team member to a case
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const { firId, userId: targetUserId, officerName, role } = body

    if (!firId || !officerName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: firId, officerName, role' },
        { status: 400 }
      )
    }

    // Verify the user has write access to this case
    const { requireCaseAccess } = await import('@/lib/rbac')
    const access = await requireCaseAccess(request, firId, true)
    if (!access.allowed || access.error) return access.error!

    // Check if user is already a team member
    const existing = await db.caseTeamMember.findUnique({
      where: { firId_userId: { firId, userId: targetUserId || 'no-user' } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This officer is already a team member on this case' },
        { status: 409 }
      )
    }

    const member = await db.caseTeamMember.create({
      data: {
        firId,
        userId: targetUserId || null,
        officerName,
        role: role || 'Supporting Investigator',
        addedBy: user!.username,
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'ADD_CASE_MEMBER',
      modelType: 'CaseTeamMember',
      objectId: member.id,
      details: { firId, officerName, role, addedBy: user!.username },
      request,
    })

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (error) {
    console.error('Error adding case team member:', error)
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 })
  }
}

// DELETE /api/case-team - Remove a team member from a case
export async function DELETE(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const { searchParams } = request.nextUrl
    const memberId = searchParams.get('memberId')
    const firId = searchParams.get('firId')

    if (!memberId || !firId) {
      return NextResponse.json(
        { error: 'Missing required params: memberId, firId' },
        { status: 400 }
      )
    }

    const { requireCaseAccess } = await import('@/lib/rbac')
    const access = await requireCaseAccess(request, firId, true)
    if (!access.allowed || access.error) return access.error!

    const member = await db.caseTeamMember.findUnique({ where: { id: memberId } })
    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Prevent removing the lead investigator
    if (member.role === 'Lead Investigator' && !access.isCommander) {
      return NextResponse.json(
        { error: 'Cannot remove the lead investigator. Reassign the case first.' },
        { status: 403 }
      )
    }

    await db.caseTeamMember.delete({ where: { id: memberId } })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'REMOVE_CASE_MEMBER',
      modelType: 'CaseTeamMember',
      objectId: memberId,
      details: { firId, removedOfficer: member.officerName, role: member.role },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing case team member:', error)
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
  }
}
