import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { hashPassword, getRoleLabel } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/users - List all users (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireRole(request, 'ADMIN')
    if (error) return error

    const users = await db.user.findMany({
      include: {
        officer: { select: { name: true, badgeNumber: true, department: true, rank: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Don't expose password hashes
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      roleLabel: getRoleLabel(u.role),
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      failedAttempts: u.failedAttempts,
      lockedUntil: u.lockedUntil,
      officer: u.officer,
      createdAt: u.createdAt,
    }))

    return NextResponse.json(safeUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create a new user (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireRole(request, 'ADMIN')
    if (error) return error

    const body = await request.json()
    const { username, password, role, officerId, isActive } = body

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: username, password, role' },
        { status: 400 }
      )
    }

    // Check username uniqueness
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }

    const validRoles = ['ADMIN', 'STATION_COMMANDER', 'INVESTIGATOR', 'CLERK']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const newUser = await db.user.create({
      data: {
        username,
        passwordHash,
        role,
        officerId: officerId || null,
        isActive: isActive !== false,
      },
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'CREATE_USER',
      modelType: 'User',
      objectId: newUser.id,
      details: { newUsername: username, newRole: role, officerId },
      request,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        roleLabel: getRoleLabel(newUser.role),
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

// PATCH /api/users - Update user (ADMIN only)
export async function PATCH(request: NextRequest) {
  try {
    const { error, user } = await requireRole(request, 'ADMIN')
    if (error) return error

    const body = await request.json()
    const { id, role, isActive, password, officerId } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    // Prevent self-demotion
    if (id === user!.id && role) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (officerId !== undefined) updateData.officerId = officerId
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      updateData.passwordHash = await hashPassword(password)
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
    })

    await logAudit({
      userId: user!.id,
      username: user!.username,
      action: 'UPDATE_USER',
      modelType: 'User',
      objectId: id,
      details: { updatedFields: Object.keys(updateData), newRole: role },
      request,
    })

    return NextResponse.json({ success: true, data: { id: updated.id, username: updated.username, role: updated.role } })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}