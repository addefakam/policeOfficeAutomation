import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'

// GET /api/audit-logs - Get audit trail (STATION_COMMANDER and ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireRole(request, 'STATION_COMMANDER')
    if (error) return error

    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const modelType = searchParams.get('modelType')
    const userId = searchParams.get('userId')
    const objectId = searchParams.get('objectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (action) where.action = action
    if (modelType) where.modelType = modelType
    if (userId) where.userId = userId
    if (objectId) where.objectId = objectId
    if (startDate || endDate) {
      const timestampFilter: Record<string, unknown> = {}
      if (startDate) timestampFilter.gte = new Date(startDate)
      if (endDate) timestampFilter.lte = new Date(endDate)
      where.timestamp = timestampFilter
    }

    // Investigators can only see their own audit logs
    if (user!.role === 'INVESTIGATOR') {
      where.userId = user!.id
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}