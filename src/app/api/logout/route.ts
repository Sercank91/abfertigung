import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  cookies().delete('auth-token');
  
  // Dynamische Base-URL aus Request ermitteln
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('host');
  
  const actualHost = forwardedHost?.split(',')[0]?.trim() || host || 'localhost:3000';
  
  // Protokoll bestimmen
  let protocol = 'https';
  if (actualHost.includes('localhost') || actualHost.includes('127.0.0.1')) {
    protocol = 'http';
  } else if (forwardedProto) {
    protocol = forwardedProto.split(',')[0]?.trim() || 'https';
  }
  
  const baseUrl = `${protocol}://${actualHost}`;
  
  // Redirect zur Startseite der aktuellen Domain
  return NextResponse.redirect(new URL('/', baseUrl));
}
