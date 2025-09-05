import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import { db } from './db'
import { env } from './env'

export const authOptions: NextAuthOptions = {
  adapter: env.DATABASE_URL ? PrismaAdapter(db) : undefined,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email
      if (!email) return false
      
      const allowedEmails = env.ALLOWED_EMAILS?.split(',').map(email => email.trim()) || []
      const isAllowed = allowedEmails.some(
        allowedEmail => email.toLowerCase() === allowedEmail.toLowerCase()
      )
      
      return isAllowed
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: env.DATABASE_URL ? 'database' : 'jwt',
  },
}