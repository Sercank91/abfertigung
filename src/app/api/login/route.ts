import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')

// Direkte PostgreSQL Verbindung
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'abfertigung',
  user: 'postgres',
  password: 'Manisali45!*',
})

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔐 Login attempt:', email)
    console.log('🔑 Password entered:', password)

    // Direktes SQL mit pg
    const result = await pool.query(
      `SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.password, 
        u.role, 
        u."tenantId",
        t.name as "tenantName"
      FROM "User" u 
      JOIN "Tenant" t ON u."tenantId" = t.id 
      WHERE u.email = $1`,
      [email]
    )

    console.log('👤 Users found:', result.rows.length)

    if (result.rows.length === 0) {
      console.log('❌ No user found')
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = result.rows[0]
    console.log('✅ User found:', user.email)
    console.log('🔑 Password in DB:', user.password)
    console.log('🔍 Match?', password === user.password)

    // Passwort check (Klartext)
    if (password !== user.password) {
      console.log('❌ Password mismatch!')
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('✅ Password correct! Creating token...')

    // JWT Token erstellen
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(SECRET)

    console.log('✅ Token created, setting cookie...')

    // Cookie setzen
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    })

    console.log('✅ Login successful!')

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        role: user.role
      }
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}