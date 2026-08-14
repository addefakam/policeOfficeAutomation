import bcrypt from 'bcryptjs'
import type { Role } from '@prisma/client'

export const ROLE_HIERARCHY: Record<string, number> = {
  CLERK: 1,
  INVESTIGATOR: 2,
  STATION_COMMANDER: 3,
  ADMIN: 4,
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function hasMinRole(userRole: string, requiredRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'System Administrator',
    STATION_COMMANDER: 'Station Commander',
    INVESTIGATOR: 'Investigator',
    CLERK: 'Clerk',
  }
  return labels[role] || role
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    STATION_COMMANDER: 'bg-purple-100 text-purple-800',
    INVESTIGATOR: 'bg-blue-100 text-blue-800',
    CLERK: 'bg-gray-100 text-gray-800',
  }
  return colors[role] || 'bg-gray-100 text-gray-600'
}