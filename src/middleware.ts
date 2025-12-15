import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { getSubdomainFromHost } from '@/lib/tenant';

const getSecret = () => getJwtSecret();

export async function middleware(request: NextRequest) {
  // Host ermitteln (Cloudflare Support)
  // X-Forwarded-Host hat Vorrang, falls vorhanden (Original Domain vom User)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  // Nehme den ersten Host aus x-forwarded-host (falls kommagetrennt) oder fallback auf host header
  const hostname = forwardedHost?.split(',')[0] || hostHeader || request.nextUrl.hostname || '';
  
  const hostTenantId = getSubdomainFromHost(hostname);
  const isMainDomain = hostTenantId === null;

  // Prüfe ob User eingeloggt ist
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