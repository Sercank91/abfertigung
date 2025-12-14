import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ✅ JWT Secret mit Validierung
if (!process.env.JWT_SECRET) {
  throw new Error('❌ CRITICAL: JWT_SECRET environment variable is missing!');
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

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
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, SECRET);

    const hostname = request.headers.get('host') || '';
    const hostnameWithoutPort = hostname.split(':')[0];
    let hostTenantId = null;

    if (hostnameWithoutPort !== 'localhost' && hostnameWithoutPort !== 'www.localhost' && hostnameWithoutPort !== 'abfertigung.io' && hostnameWithoutPort !== 'www.abfertigung.io') {
      if (hostnameWithoutPort.endsWith('.localhost')) hostTenantId = hostnameWithoutPort.split('.')[0];
      else if (hostnameWithoutPort.endsWith('.abfertigung.io')) hostTenantId = hostnameWithoutPort.split('.')[0];
    }

    // Cross-Tenant Check
    if (hostTenantId && (payload as any).tenantSlug && hostTenantId !== (payload as any).tenantSlug) {
      return null;
    }

    return payload as unknown as AuthUser;
  } catch (error) {
    // Token ist ungültig oder abgelaufen
    console.error('Token verification failed:', error);
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
