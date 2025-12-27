import { NextRequest, NextResponse } from 'next/server';
import { querySystem } from '@/lib/db';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/password';
import { LoginSchema, validateData } from '@/lib/validators';
import logger from '@/lib/logger';
import { handleApiError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { getJwtSecret } from '@/lib/auth';
import { parseTenantFromHostname } from '@/lib/tenant';

// ✅ JWT Secret MUSS vorhanden sein - kein Fallback!
// Check moved to inside handler to prevent build crashes

/**
 * POST /api/login
 *
 * Login-Endpoint für Multi-Tenant Authentifizierung.
 * Subdomain bestimmt welcher Tenant (Firma) sich anmeldet.
 */
export const POST = handleApiError(async (request: NextRequest) => {
  let SECRET;
  try {
    SECRET = getJwtSecret();
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // ✅ Input-Validierung mit Zod
  const body = await request.json();
  const { username, password } = validateData(LoginSchema, body);
    
  // 🔒 SECURITY: Verwende zentrale Tenant-Validierung
  // NIEMALS x-forwarded-host verwenden - verhindert Host Header Spoofing
  let hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get('host');
  
  // Cloud Run Fix: In Production, verwende Host-Header wenn hostname ungültig ist
  if (process.env.NODE_ENV === 'production' && hostHeader) {
    if (hostname === '0.0.0.0' || hostname.endsWith('.run.app')) {
      hostname = hostHeader.toLowerCase().split(':')[0];
    }
  }
  
  // 🧪 DEV-ONLY: Debug-Logging für localhost-Entwicklung
  if (process.env.NODE_ENV !== 'production' && hostname.includes('localhost')) {
    console.log('[DEV] Login Request:', { 
      'nextUrl.hostname': hostname,
      'headers.host': hostHeader,
      'nextUrl.href': request.nextUrl.href
    });
  }
  
  const { tenant: subdomain, isValidHost, reason } = parseTenantFromHostname(hostname, hostHeader);

  // Blockiere ungültige Hosts
  if (!isValidHost) {
    // 🧪 DEV-ONLY: Erweiterte Fehlerinfo für Debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEV] Host validation failed:', { hostname, isValidHost, reason, subdomain });
    }
    logger.auth.loginFailed(username, `Ungültiger Host: ${reason}`);
    throw new ForbiddenError('Ungültiger Host');
  }

  if (!subdomain) {
    // 🧪 DEV-ONLY: Erweiterte Fehlerinfo für Debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEV] No subdomain extracted:', { hostname, isValidHost, subdomain });
    }
    throw new NotFoundError('Login nur über Firmen-Subdomain möglich');
  }

  // ✅ Strukturiertes Logging
  logger.auth.loginAttempt(username, subdomain);

  // 🔒 SECURITY: Login-Queries sind System-Queries (laufen VOR Tenant-Bestimmung)
  // Verwende querySystem() statt queryTenant()

  // 1. Tenant finden
  const tenantResult = await querySystem(
    'SELECT id, name, domain FROM "Tenant" WHERE domain = $1',
    [subdomain]
  );

  if (tenantResult.rows.length === 0) {
    // 🧪 DEV-ONLY: Erweiterte Fehlerinfo für Debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('[DEV] Tenant not found in database:', { subdomain, hostname });
    }
    logger.auth.loginFailed(username, 'Tenant nicht gefunden');
    throw new NotFoundError('Firma nicht gefunden');
  }

  const tenant = tenantResult.rows[0];

  // 2. User finden (mit username)
  const userResult = await querySystem(
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
  (await cookies()).set('auth-token', token, {
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