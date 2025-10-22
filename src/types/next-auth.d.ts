import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    tenantId: string
    tenantName: string
    role: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      tenantId: string
      tenantName: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    tenantId: string
    tenantName: string
    role: string
  }
}