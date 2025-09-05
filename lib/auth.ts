import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'

// Function to safely get environment variables
const getEnvVar = (name: string, fallback: string = '') => {
  return process.env[name] || fallback
}

// Lazy load database connection only when needed
const getDbAdapter = () => {
  if (!process.env.DATABASE_URL) return undefined
  try {
    const { db } = require('./db')
    return PrismaAdapter(db)
  } catch (error) {
    console.warn('Database adapter not available:', error)
    return undefined
  }
}

export const authOptions: NextAuthOptions = {
  adapter: getDbAdapter(),
  providers: [
    GoogleProvider({
      clientId: getEnvVar('GOOGLE_CLIENT_ID'),
      clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET'),
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email
      if (!email) return false
      
      const allowedEmailsStr = getEnvVar('ALLOWED_EMAILS')
      const allowedEmails = allowedEmailsStr ? allowedEmailsStr.split(',').map(email => email.trim()) : []
      
      if (allowedEmails.length === 0) {
        console.warn('No allowed emails configured')
        return false
      }
      
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
    strategy: process.env.DATABASE_URL ? 'database' : 'jwt',
  },
}