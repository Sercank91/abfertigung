import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { parseTenantFromHostname } from '@/lib/tenant';

const getSecret = () => getJwtSecret();

export async function middleware(request: NextRequest) {
  // 🔒 SECURITY: Verwende AUSSCHLIESSLICH request.nextUrl.hostname
  // NIEMALS x-forwarded-host verwenden - kann vom Angreifer manipuliert werden!
  // Dies verhindert Host Header Spoofing und Tenant Escape Angriffe.
  const hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get('host');
  
  // 🧪 DEV-ONLY: Debug-Logging für localhost-Entwicklung
  if (process.env.NODE_ENV !== 'production' && hostname.includes('localhost')) {
    console.log('[DEV] Middleware:', { 
      path: request.nextUrl.pathname,
      'nextUrl.hostname': hostname,
      'headers.host': hostHeader
    });
  }
  
  // Zentrale Tenant-Validierung mit Allowlist
  // 🧪 DEV-ONLY: Host-Header wird nur für localhost-Subdomain-Fallback verwendet
  const { tenant: hostTenantId, isValidHost, isAdminMode, reason } = parseTenantFromHostname(hostname, hostHeader);
  
  // 🛡️ BLOCKIERE ungültige Hosts sofort
  if (!isValidHost) {
    console.error(`[SECURITY] Ungültiger Host blockiert: ${hostname} - ${reason}`);
    return NextResponse.json(
      { error: 'Ungültiger Host' },
      { status: 403 }
    );
  }
  
  const isMainDomain = hostTenantId === null && !isAdminMode;

  const { pathname } = request.nextUrl;

  // 🔐 ADMIN-MODE: Separate Authentifizierung
  if (isAdminMode) {
    const adminToken = request.cookies.get('admin-token');
    let adminUser = null;

    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken.value, getSecret());
        adminUser = payload;
      } catch (error) {
        // Admin Token ungültig
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        response.cookies.delete('admin-token');
        return response;
      }
    }

    // Admin nicht eingeloggt → Redirect zu Admin Login (außer Login-Page selbst)
    if (!adminUser && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Admin eingeloggt → Leite /admin/login zu /admin um
    if (adminUser && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  }

  // 🔐 TENANT-MODE: Normale Tenant-Authentifizierung
  const token = request.cookies.get('auth-token');
  let user = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token.value, getSecret());
      user = payload;
    } catch (error) {
      // Token ungültig
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Cross-Tenant Gate
  if (user && hostTenantId && (user as any).tenantSlug && (user as any).tenantSlug !== hostTenantId) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Subdomain-Logik (z.B. verag.localhost:3000)
  if (!isMainDomain) {
    // User ist NICHT eingeloggt → Zeige Login
    if (!user && pathname !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // User ist eingeloggt → Leite / zu /dashboard um
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Hauptdomain-Logik (z.B. localhost:3000)
  if (isMainDomain) {
    // Zeige Landing Page / Registration
    if (pathname === '/') {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|tenant-logos).*)',
  ],
};