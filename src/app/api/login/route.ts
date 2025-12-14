import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/password';
import { LoginSchema, validateData } from '@/lib/validators';
import logger from '@/lib/logger';
import { handleApiError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

// ✅ JWT Secret MUSS vorhanden sein - kein Fallback!
if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable is missing!');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * POST /api/login
 *
 * Login-Endpoint für Multi-Tenant Authentifizierung.
 * Subdomain bestimmt welcher Tenant (Firma) sich anmeldet.
 */
export const POST = handleApiError(async (request: NextRequest) => {
  // ✅ Input-Validierung mit Zod
  const body = await request.json();
  const { username, password } = validateData(LoginSchema, body);
    
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0].replace(':3000', '');

  // ✅ Strukturiertes Logging
  logger.auth.loginAttempt(username, subdomain);

  // 1. Tenant finden
  const tenantResult = await pool.query(
    'SELECT id, name, domain FROM "Tenant" WHERE domain = $1',
    [subdomain]
  );

  if (tenantResult.rows.length === 0) {
    logger.auth.loginFailed(username, 'Tenant nicht gefunden');
    throw new NotFoundError('Firma nicht gefunden');
  }

  const tenant = tenantResult.rows[0];

  // 2. User finden (mit username)
  const userResult = await pool.query(
    `SELECT
      u.id, u.username, u.email, u."firstName", u."lastName", u.password, u.role, u."tenantId", u.phone, u."isActive",
      t.name as "tenantName"
    FROM "User" u
    JOIN "Tenant" t ON u."tenantId" = t.id
    WHERE u.username = $1 AND u."tenantId" = $2`,
    [username, tenant.id]
  );

  if (userResult.rows.length === 0) {
    logger.auth.loginFailed(username, 'User nicht gefunden');
    throw new UnauthorizedError('Ungültige Anmeldedaten');
  }

  const user = userResult.rows[0];

  // 3. Prüfe ob User aktiv ist
  if (!user.isActive) {
    logger.auth.loginFailed(username, 'Account deaktiviert');
    throw new ForbiddenError('Ihr Account wurde deaktiviert');
  }

  // 4. Passwort check mit bcrypt
  const isValidPassword = await verifyPassword(password, user.password);

  if (!isValidPassword) {
    logger.auth.loginFailed(username, 'Falsches Passwort');
    throw new UnauthorizedError('Ungültige Anmeldedaten');
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
    tenantSlug: tenant.domain || subdomain,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET);

  // 6. Cookie setzen
  cookies().set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 Stunden
  });

  // ✅ Strukturiertes Success-Logging
  logger.auth.loginSuccess(user.username, user.role, tenant.name);

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
      tenantSlug: tenant.domain || subdomain,
      role: user.role
    }
  });
});