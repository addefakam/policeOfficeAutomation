import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole, getSessionUser } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// GET /api/firs - Get FIRs (need-to-know: investigators see only own cases)
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firNumber: { contains: search } },
        { complainantName: { contains: search } },
        { incidentLocation: { contains: search } },
        { description: { contains: search } },
        { accusedNames: { contains: search } },
      ]
    }
    if (status) where.status = status
    if (category) where.crimeCategory = category
    if (priority) where.priority = priority

    // NEED-TO-KNOW: Investigators see only cases assigned to them or where they are team members
    // Commanders and Admins see all cases
    if (user!.role === 'INVESTIGATOR' || user!.role === 'CLERK') {
      // Get case IDs where user is in the case team
      const teamCaseIds = await db.caseTeamMember.findMany({
        where: { userId: user!.id },
        select: { firId: true },
      })
      const teamFirIds = teamCaseIds.map(t => t.firId)

      // Get case IDs where user has approved consultation
      const consultationCaseIds = await db.consultationRequest.findMany({
        where: {
          requestorId: user!.id,
          status: 'Approved',
          expiresAt: { gt: new Date() },
        },
        select: { firId: true },
      })
      const consultationFirIds = consultationCaseIds.map(c => c.firId)

      const accessibleIds = [...teamFirIds, ...consultationFirIds]

      where.OR = [
        { assignedTo: user!.name },
        ...(accessibleIds.length > 0 ? [{ id: { in: accessibleIds } }] : []),
      ]
    }

    const firs = await db.fIR.findMany({
      where,
      include: {
        investigationNotes: { orderBy: { createdAt: 'desc' } },
        caseTeam: true,
        _count: { select: { evidenceItems: true, consultationRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Log that user viewed the case list
    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'VIEW_CASE',
      modelType: 'FIR',
      details: { filter: { search, status, category, priority }, resultCount: firs.length },
      request,
    })

    return NextResponse.json(firs)
  } catch (error) {
    console.error('Error fetching FIRs:', error)
    return NextResponse.json({ error: 'Failed to fetch FIRs' }, { status: 500 })
  }
}

// POST /api/firs - Create a new FIR
export async function POST(request: NextRequest) {
  try {
    // All authenticated users can register FIRs (clerks, investigators, commanders, admins)
    const { error, user } = await requireAuth(request)
    if (error) return error

    const body = await request.json()
    const {
      firNumber, complainantName, complainantPhone, complainantAddress,
      incidentDate, incidentLocation, crimeCategory, description,
      accusedNames, status, assignedTo, priority, station,
    } = body

    if (!firNumber || !complainantName || !incidentDate || !incidentLocation || !crimeCategory || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: firNumber, complainantName, incidentDate, incidentLocation, crimeCategory, description' },
        { status: 400 }
      )
    }

    const fir = await db.fIR.create({
      data: {
        firNumber, complainantName, complainantPhone, complainantAddress,
        incidentDate: new Date(incidentDate), incidentLocation, crimeCategory,
        description, accusedNames,
        status: status || 'Open',
        assignedTo,
        priority: priority || 'Medium',
        station: station || 'Main Station',
      },
    })

    // Auto-add creating user as team member if they're the assigned investigator
    if (assignedTo === user!.name) {
      const userRecord = await db.user.findUnique({ where: { id: user!.id } })
      if (userRecord) {
        await db.caseTeamMember.create({
          data: {
            firId: fir.id,
            userId: user!.id,
            officerName: user!.name,
            role: 'Lead Investigator',
            addedBy: user!.username,
          },
        })
      }
    }

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'CREATE_CASE',
      modelType: 'FIR',
      objectId: fir.id,
      details: { firNumber, crimeCategory, priority, station },
      request,
    })

    return NextResponse.json({ success: true, data: fir }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating FIR:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'FIR number already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create FIR' }, { status: 500 })
  }
}
