import { db } from './db'
import type { NextRequest } from 'next/server'
import type { Role } from '@prisma/client'

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'VIEW_CASE'
  | 'CREATE_CASE'
  | 'EDIT_CASE'
  | 'DELETE_CASE'
  | 'TRANSFER_CASE'
  | 'CLOSE_CASE'
  | 'ADD_NOTE'
  | 'ADD_CASE_MEMBER'
  | 'REMOVE_CASE_MEMBER'
  | 'ADD_EVIDENCE'
  | 'TRANSFER_EVIDENCE'
  | 'REQUEST_CONSULTATION'
  | 'APPROVE_CONSULTATION'
  | 'REJECT_CONSULTATION'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DEACTIVATE_USER'
  | 'APPROVE_LEAVE'
  | 'REJECT_LEAVE'
  | 'ASSIGN_DUTY'
  | 'CREATE_OFFICER'
  | 'UPDATE_OFFICER'
  | 'OTHER'

interface AuditOptions {
  userId?: string
  username: string
  action: AuditAction
  modelType: string
  objectId?: string
  details?: Record<string, unknown>
  request?: NextRequest
}

export async function logAudit(opts: AuditOptions): Promise<void> {
  try {
    const ipAddress = opts.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || opts.request?.headers.get('x-real-ip') 
      || 'unknown'
    const userAgent = opts.request?.headers.get('user-agent') || 'unknown'
    const details = opts.details ? JSON.stringify(opts.details) : null

    await db.auditLog.create({
      data: {
        userId: opts.userId || null,
        username: opts.username,
        action: opts.action,
        modelType: opts.modelType,
        objectId: opts.objectId || null,
        details,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error('Audit log failed:', error)
  }
}

// Lightweight version that doesn't need a request object
export async function logAuditSimple(opts: Omit<AuditOptions, 'request'>): Promise<void> {
  await logAudit({ ...opts, request: undefined as unknown as NextRequest })
}
