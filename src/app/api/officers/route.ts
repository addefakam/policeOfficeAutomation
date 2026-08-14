import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

// GET /api/officers - Get all officers
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireAuth(request)
    if (error) return error

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { badgeNumber: { contains: search } },
        { rank: { contains: search } },
        { email: { contains: search } },
      ]
    }
    if (department) where.department = department
    if (status) where.status = status

    const officers = await db.officer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(officers)
  } catch (error) {
    console.error('Error fetching officers:', error)
    return NextResponse.json({ error: 'Failed to fetch officers' }, { status: 500 })
  }
}

// POST /api/officers - Create a new officer (INVESTIGATOR+ only)
export async function POST(request: NextRequest) {
  try {
    const { requireRole } = await import('@/lib/rbac')
    const { error, user } = await requireRole(request, 'INVESTIGATOR')
    if (error) return error

    const body = await request.json()
    const { badgeNumber, name, rank, department, phone, email, status } = body

    if (!badgeNumber || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: badgeNumber, name' },
        { status: 400 }
      )
    }

    const officer = await db.officer.create({
      data: {
        badgeNumber, name,
        rank: rank || 'Officer',
        department: department || 'General Patrol',
        phone, email,
        status: status || 'Active',
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'CREATE_OFFICER',
      modelType: 'Officer',
      objectId: officer.id,
      details: { badgeNumber, name, rank, department },
      request,
    })

    return NextResponse.json({ success: true, data: officer }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating officer:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Badge number already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create officer' }, { status: 500 })
  }
}
