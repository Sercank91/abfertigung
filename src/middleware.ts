import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || request.nextUrl.hostname || '';
  const hostnameWithoutPort = hostname.split(':')[0];
  let hostTenantId = null;

  if (hostnameWithoutPort === 'localhost' || hostnameWithoutPort === 'www.localhost' || hostnameWithoutPort === 'abfertigung.io' || hostnameWithoutPort === 'www.abfertigung.io') {
    hostTenantId = null;
  } else if (hostnameWithoutPort.endsWith('.localhost')) {
    hostTenantId = hostnameWithoutPort.split('.')[0];
  } else if (hostnameWithoutPort.endsWith('.abfertigung.io')) {
    hostTenantId = hostnameWithoutPort.split('.')[0];
  }

  const isMainDomain = hostTenantId === null;

  // Prüfe ob User eingeloggt ist
  const token = request.cookies.get('auth-token');
  let user = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token.value, SECRET);
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

  const { pathname } = request.nextUrl;

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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};