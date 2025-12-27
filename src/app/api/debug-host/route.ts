import { NextRequest, NextResponse } from 'next/server';

/**
 * 🧪 DEV-ONLY: Debug-Endpoint zum Testen der Hostname-Erkennung
 * 
 * Aufruf: http://verag.localhost:3000/api/debug-host
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const hostname = request.nextUrl.hostname;
  const hostHeader = request.headers.get('host');
  const xForwardedHost = request.headers.get('x-forwarded-host');
  const url = request.nextUrl.href;
  const origin = request.nextUrl.origin;

  return NextResponse.json({
    'request.nextUrl.hostname': hostname,
    'request.headers.host': hostHeader,
    'request.headers.x-forwarded-host': xForwardedHost,
    'request.nextUrl.href': url,
    'request.nextUrl.origin': origin,
    'NODE_ENV': process.env.NODE_ENV,
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}







