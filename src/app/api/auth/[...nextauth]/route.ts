import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
          include: { officer: true },
        })

        if (!user) return null
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return null
        if (!user.isActive) return null

        const isValid = await verifyPassword(credentials.password as string, user.passwordHash)
        if (!isValid) {
          await db.user.update({
            where: { id: user.id },
            data: { failedAttempts: { increment: 1 } },
          })
          return null
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() },
        })

        return {
          id: user.id,
          name: user.officer?.name || user.username,
          email: user.officer?.email || '',
          username: user.username,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      ;(session.user as any).username = token.username
      ;(session.user as any).role = token.role
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'police-system-dev-secret-change-in-production',
})

export const { GET, POST } = handlers
