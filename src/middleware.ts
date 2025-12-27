import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { parseTenantFromHostname } from '@/lib/tenant';

const getSecret = () => getJwtSecret();

export async function middleware(request: NextRequest) {
  let hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get('host');
  
  if (process.env.NODE_ENV === 'production' && hostHeader) {
    if (hostname === '0.0.0.0' || hostname.endsWith('.run.app')) {
      const hostWithoutPort = hostHeader.toLowerCase().split(':')[0];
      console.log('[CLOUD_RUN] Using Host header instead of nextUrl.hostname:', {
        'nextUrl.hostname': hostname,
        'host header': hostHeader,
        'using': hostWithoutPort
      });
      hostname = hostWithoutPort;
    }
  }
  
  if (process.env.NODE_ENV !== 'production' && hostname.includes('localhost')) {
    console.log('[DEV] Middleware:', { 
      path: request.nextUrl.pathname,
      'nextUrl.hostname': hostname,
      'headers.host': hostHeader
    });
  }
  
  const { tenant: hostTenantId, isValidHost, isAdminMode, reason } = parseTenantFromHostname(hostname, hostHeader);
  
  if (!isValidHost) {
    console.error(`[SECURITY] Ungültiger Host blockiert: ${hostname} - ${reason}`);
    return NextResponse.json(
      { error: 'Ungültiger Host' },
      { status: 403 }
    );
  }
  
  const isMainDomain = hostTenantId === null && !isAdminMode;

  const { pathname } = request.nextUrl;

  if (isAdminMode) {
    const adminToken = request.cookies.get('admin-token');
    let adminUser = null;

    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken.value, getSecret());
        adminUser = payload;
      } catch (error) {
        const response = NextResponse.redirect(new URL('/admin/login', request.url));
        response.cookies.delete('admin-token');
        return response;
      }
    }

    if (!adminUser && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (adminUser && pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token');
  let user = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token.value, getSecret());
      user = payload;
    } catch (error) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  if (user && hostTenantId && (user as any).tenantSlug && (user as any).tenantSlug !== hostTenantId) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  if (!isMainDomain) {
    if (!user && pathname !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (isMainDomain) {
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