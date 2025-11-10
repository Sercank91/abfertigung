import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { verifyPassword } from '@/lib/password'
import { LoginSchema, validateData } from '@/lib/validators'

// ✅ JWT Secret MUSS vorhanden sein - kein Fallback!
if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable is missing!');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

/**
 * POST /api/login
 *
 * Login-Endpoint für Multi-Tenant Authentifizierung.
 * Subdomain bestimmt welcher Tenant (Firma) sich anmeldet.
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Input-Validierung mit Zod
    const body = await request.json()
    const { username, password } = validateData(LoginSchema, body)
    
    const hostname = request.headers.get('host') || ''
    const subdomain = hostname.split('.')[0].replace(':3000', '')

    console.log('🔐 Login-Versuch:', username, 'auf Subdomain:', subdomain)

    // 1. Tenant finden
    const tenantResult = await pool.query(
      `SELECT id, name, domain FROM "Tenant" WHERE domain = $1`,
      [subdomain]
    )

    if (tenantResult.rows.length === 0) {
      console.log('❌ Tenant nicht gefunden:', subdomain)
      return NextResponse.json({ error: 'Firma nicht gefunden' }, { status: 404 })
    }

    const tenant = tenantResult.rows[0]

    // 2. User finden (mit username)
    const userResult = await pool.query(
      `SELECT
        u.id, u.username, u.email, u."firstName", u."lastName", u.password, u.role, u."tenantId", u.phone, u."isActive",
        t.name as "tenantName"
      FROM "User" u
      JOIN "Tenant" t ON u."tenantId" = t.id
      WHERE u.username = $1 AND u."tenantId" = $2`,
      [username, tenant.id]
    )

    if (userResult.rows.length === 0) {
      console.log('❌ User nicht gefunden:', username, 'in Tenant:', tenant.id)
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    const user = userResult.rows[0]

    // 3. Prüfe ob User aktiv ist
    if (!user.isActive) {
      console.log('❌ Inaktiver User-Login-Versuch:', username)
      return NextResponse.json({ error: 'Ihr Account wurde deaktiviert' }, { status: 403 })
    }

    // 4. Passwort check mit bcrypt
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      console.log('❌ Falsches Passwort für User:', username)
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }

    // 5. JWT Token erstellen
    const token = await new SignJWT({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(SECRET)

    // 6. Cookie setzen
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 Stunden
    })

    console.log('✅ Login erfolgreich:', user.username, 'Rolle:', user.role, 'Tenant:', tenant.name)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        role: user.role
      }
    })

  } catch (error) {
    // ✅ Bessere Fehlerbehandlung
    if (error instanceof Error && error.message.includes('Validierungsfehler')) {
      console.log('❌ Login-Validierungsfehler:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.error('❌ Login-Fehler:', error)
    return NextResponse.json(
      { error: 'Login fehlgeschlagen. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    )
  }
}