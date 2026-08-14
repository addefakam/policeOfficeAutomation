import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('Creating user accounts...')

  // Create demo users with unique passwords
  const users = [
    { username: 'admin', password: 'admin123', role: 'ADMIN' as const, badgeNumber: null }, // Admin has no officer profile
    { username: 'commander', password: 'cmd123', role: 'STATION_COMMANDER' as const, badgeNumber: 'P-1006' },
    { username: 'abebe', password: 'abebe123', role: 'INVESTIGATOR' as const, badgeNumber: 'P-1001' },
    { username: 'haile', password: 'haile123', role: 'INVESTIGATOR' as const, badgeNumber: 'P-1002' },
    { username: 'clerk1', password: 'clerk123', role: 'CLERK' as const, badgeNumber: 'P-1008' },
  ]

  for (const u of users) {
    const officer = u.badgeNumber ? await db.officer.findUnique({ where: { badgeNumber: u.badgeNumber } }) : null
    const passwordHash = await hashPassword(u.password)

    const user = await db.user.upsert({
      where: { username: u.username },
      update: { passwordHash, role: u.role, officerId: officer?.id || null, isActive: true },
      create: {
        username: u.username,
        passwordHash,
        role: u.role,
        officerId: officer?.id || null,
      },
    })

    // Also create case team entries for investigators on their assigned cases
    if (u.role === 'INVESTIGATOR' && officer) {
      const assignedFirs = await db.fIR.findMany({
        where: { assignedTo: officer.name },
        select: { id: true },
      })
      for (const fir of assignedFirs) {
        await db.caseTeamMember.upsert({
          where: { firId_userId: { firId: fir.id, userId: user.id } },
          update: {},
          create: {
            firId: fir.id,
            userId: user.id,
            officerName: officer.name,
            role: 'Lead Investigator',
            addedBy: 'admin',
          },
        })
      }
    }

    console.log(`  Created user: ${u.username} (${u.role}) -> ${officer?.name || 'no officer profile'}`)
  }

  console.log('User accounts seeded successfully!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
