import { db } from './db'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { hasMinRole } from './auth'
import { logAudit } from './audit'

/**
 * Get the current authenticated user from the session.
 */
export async function getSessionUser(request?: NextRequest) {
  const session = await auth()
  if (!session?.user) return null
  return session.user as { id: string; username: string; role: string; name: string }
}

/**
 * Require authentication. Returns user or sends 401 response.
 */
export async function requireAuth(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }), user: null }
  }
  return { error: null, user }
}

/**
 * Require a minimum role level.
 */
export async function requireRole(request: NextRequest, minRole: string) {
  const { error: authError, user } = await requireAuth(request)
  if (authError) return { error: authError, user: null }
  if (!user || !hasMinRole(user.role, minRole)) {
    await logAudit({
      userId: user?.id,
      username: user?.username || 'unknown',
      action: 'OTHER',
      modelType: 'Auth',
      details: { attemptedAction: 'requireRole', requiredRole: minRole, actualRole: user?.role },
      request,
    })
    return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }), user: null }
  }
  return { error: null, user: user! }
}

/**
 * Check case access with need-to-know enforcement.
 */
export async function requireCaseAccess(
  request: NextRequest,
  firId: string,
  requireWrite: boolean = false
) {
  const { error: authError, user } = await requireAuth(request)
  if (authError) return { allowed: false, fir: null, user: null, error: authError, isOwner: false, isCommander: false }

  const fir = await db.fIR.findUnique({
    where: { id: firId },
    include: {
      caseTeam: true,
      consultationRequests: {
        where: {
          requestorId: user!.id,
          status: 'Approved',
          expiresAt: { gt: new Date() },
        },
      },
    },
  })

  if (!fir) {
    return { allowed: false, fir: null, user, error: NextResponse.json({ error: 'FIR not found' }, { status: 404 }), isOwner: false, isCommander: false }
  }

  const isCommanderOrAbove = hasMinRole(user!.role, 'STATION_COMMANDER')
  if (isCommanderOrAbove) {
    return { allowed: true, fir, user: user!, error: null, isOwner: false, isCommander: true }
  }

  const isAssignedInvestigator = fir.assignedTo === user!.name
  const isTeamMember = fir.caseTeam.some(m => m.userId === user!.id)
  const hasConsultation = fir.consultationRequests.length > 0

  const canView = isAssignedInvestigator || isTeamMember || hasConsultation
  const canWrite = isAssignedInvestigator || isTeamMember

  if (requireWrite && !canWrite) {
    return {
      allowed: false, fir, user: user!,
      error: NextResponse.json(
        { error: `This case is assigned to ${fir.assignedTo || 'no one'}. You have read-only access.` },
        { status: 403 }
      ),
      isOwner: false, isCommander: false,
    }
  }

  if (!canView) {
    return {
      allowed: false, fir, user: user!,
      error: NextResponse.json(
        { error: 'You do not have access to this case. Case is assigned to ' + (fir.assignedTo || 'no one') + '. Request a consultation if you need access.' },
        { status: 403 }
      ),
      isOwner: false, isCommander: false,
    }
  }

  return {
    allowed: true, fir, user: user!, error: null,
    isOwner: isAssignedInvestigator,
    isCommander: false,
  }
}