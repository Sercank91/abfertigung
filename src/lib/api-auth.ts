import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { parseTenantFromHostname } from '@/lib/tenant';

// ✅ JWT Secret Validierung (Moved to function scope to avoid build-time errors)
// if (!process.env.JWT_SECRET) { ... }

/**
 * User-Daten aus JWT Token
 */
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantName: string;
  tenantSlug?: string;
  role: string;
}

/**
 * 🔐 Zentrale Funktion: Authentifizierung aus JWT Token
 *
 * Wird verwendet in ALLEN API-Routes die Authentifizierung brauchen.
 *
 * @param request - Next.js Request Objekt
 * @returns User-Daten oder null wenn nicht authentifiziert
 *
 * @example
 * ```typescript
 * const user = await getUserFromToken(request);
 * if (!user) {
 *   return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
 * }
 * ```
 */
export async function getUserFromToken(request: NextRequest): Promise<AuthUser | null> {
  // 🔒 SECURITY: JWT_SECRET MUSS in production vorhanden sein
  let SECRET;
  try {
    SECRET = getJwtSecret();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] CRITICAL: JWT_SECRET fehlt in Production!');
      throw new Error('Server configuration error');
    }
    console.error('[DEV] JWT_SECRET fehlt:', error);
    return null;
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Kein Token => nicht eingeloggt (normal)
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    let hostname = request.nextUrl?.hostname || '';
    const hostHeader = request.headers.get('host');
    
    if (process.env.NODE_ENV === 'production' && hostHeader) {
      if (hostname === '0.0.0.0' || hostname.endsWith('.run.app')) {
        hostname = hostHeader.toLowerCase().split(':')[0];
      }
    }
    

    // 🔒 SECURITY: Verwende zentrale Tenant-Validierung
    // NIEMALS manuell host/x-forwarded-host parsen - verhindert Host Header Spoofing
    const hostname = request.nextUrl?.hostname || '';
    const { tenant: hostTenantId, isValidHost } = parseTenantFromHostname(hostname);

    // Blockiere ungültige Hosts
    if (!isValidHost) {
      console.error(`[SECURITY] API-Auth: Ungültiger Host blockiert: ${hostname}`);
      return null;
    }

    // Cross-Tenant Check: User darf nur auf seinen eigenen Tenant zugreifen
    if (hostTenantId && (payload as any).tenantSlug && hostTenantId !== (payload as any).tenantSlug) {
      console.warn(`[SECURITY] Cross-Tenant Zugriff blockiert: User ${(payload as any).tenantSlug} → Host ${hostTenantId}`);
      return null;
    }

    return payload as unknown as AuthUser;
  } catch (error) {
    // Token vorhanden aber ungültig/abgelaufen
    console.error('[AUTH] Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * 🛡️ Hilfsfunktion: Authentifizierung MUSS vorhanden sein
 *
 * Wirft einen Fehler wenn User nicht eingeloggt ist.
 * Praktisch für API-Routes die Login voraussetzen.
 *
 * @param request - Next.js Request Objekt
 * @returns User-Daten (garantiert nicht null)
 * @throws Error wenn nicht authentifiziert
 *
 * @example
 * ```typescript
 * const user = await requireAuth(request);
 * // Ab hier ist user garantiert vorhanden
 * console.log(user.tenantId);
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getUserFromToken(request);

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * 🔒 Hilfsfunktion: Prüft ob User eine bestimmte Rolle hat
 *
 * @param user - User Objekt
 * @param allowedRoles - Array von erlaubten Rollen
 * @returns true wenn User eine der Rollen hat
 *
 * @example
 * ```typescript
 * const user = await requireAuth(request);
 * if (!hasRole(user, ['admin', 'schichtleiter'])) {
 *   return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
 * }
 * ```
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * 🔒 Hilfsfunktion: Rolle MUSS vorhanden sein
 *
 * @param user - User Objekt
 * @param allowedRoles - Array von erlaubten Rollen
 * @throws Error wenn User keine passende Rolle hat
 *
 * @example
 * ```typescript
 * const user = await requireAuth(request);
 * requireRole(user, ['admin']); // Wirft Fehler wenn nicht admin
 * ```
 */
export function requireRole(user: AuthUser, allowedRoles: string[]): void {
  if (!hasRole(user, allowedRoles)) {
    throw new Error('FORBIDDEN');
  }
}
