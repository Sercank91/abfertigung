import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcryptjs';
import { getJwtSecret } from '@/lib/auth';
import { parseTenantFromHostname } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/login
 *
 * Super-Admin Login für admin.abfertigung.io / admin.localhost:3000
 */
export async function POST(request: NextRequest) {
  try {
    const SECRET = getJwtSecret();

    // 🔒 SECURITY: Prüfe dass Request von Admin-Domain kommt
    const hostname = request.nextUrl.hostname;
    const hostHeader = request.headers.get('host');
    const { isValidHost, isAdminMode, reason } = parseTenantFromHostname(hostname, hostHeader);

    if (!isValidHost || !isAdminMode) {
      console.error(`[SECURITY] Admin Login von ungültiger Domain blockiert: ${hostname} - ${reason}`);
      return NextResponse.json(
        { error: 'Zugriff verweigert' },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // Super-Admin finden
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { username }
    });

    if (!superAdmin) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // Prüfe ob aktiv
    if (!superAdmin.isActive) {
      return NextResponse.json(
        { error: 'Account deaktiviert' },
        { status: 403 }
      );
    }

    // Passwort prüfen
    const isValidPassword = await bcrypt.compare(password, superAdmin.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      );
    }

    // JWT Token erstellen
    const token = await new SignJWT({
      id: superAdmin.id,
      username: superAdmin.username,
      email: superAdmin.email,
      firstName: superAdmin.firstName,
      lastName: superAdmin.lastName,
      role: 'SUPER_ADMIN',
      isAdminMode: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(SECRET);

    // Cookie setzen (admin-token statt auth-token)
    (await cookies()).set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 Stunden
    });

    console.log(`✅ Super-Admin Login erfolgreich: ${superAdmin.username}`);

    return NextResponse.json({
      success: true,
      user: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: 'SUPER_ADMIN'
      }
    });
  } catch (error) {
    console.error('Admin Login Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

