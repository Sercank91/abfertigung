import { NextRequest, NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

async function handleLogout(request: NextRequest) {
  (await cookies()).delete('auth-token');
  
  // Hole Host-Header (enthält Subdomain und Port)
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  
  // Bestimme Protokoll
  const protocol = host.includes('localhost') ? 'http' : 'https';
  
  // Baue Redirect-URL
  const redirectUrl = `${protocol}://${host}/`;
  
  console.log('Logout redirect:', {
    host,
    protocol,
    redirectUrl,
    requestUrl: request.url
  });
  
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  return await handleLogout(request);
}

export async function POST(request: NextRequest) {
  return await handleLogout(request);
}
