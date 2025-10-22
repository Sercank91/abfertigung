import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const hostname = request.headers.get('host') || ''
    const subdomain = hostname.split('.')[0]
    
    console.log('🔐 Login attempt:', email, 'on subdomain:', subdomain)

    // 1. Tenant finden
    const tenantResult = await pool.query(
      `SELECT id, name, domain FROM "Tenant" WHERE domain = $1`,
      [subdomain]
    )

    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'Firma nicht gefunden' }, { status: 404 })
    }

    const tenant = tenantResult.rows[0]

    // 2. User finden
    const userResult = await pool.query(
      `SELECT 
        u.id, u.email, u.name, u.password, u.role, u."tenantId",
        t.name as "tenantName"
      FROM "User" u 
      JOIN "Tenant" t ON u."tenantId" = t.id 
      WHERE u.email = $1 AND u."tenantId" = $2`,
      [email, tenant.id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const user = userResult.rows[0]

    // 3. Passwort check
    if (password !== user.password) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    // 4. JWT Token
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

    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
    })

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
    return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 500 })
  }
}