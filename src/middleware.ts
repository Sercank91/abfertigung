import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  console.log('🌐 Hostname:', hostname)
  console.log('🏢 Subdomain:', subdomain)

  // Hauptdomain ohne Subdomain (z.B. localhost:3000 oder abfertigung.io)
  const isMainDomain = !hostname.includes('.') || subdomain === 'localhost' || subdomain === 'www'

  // Prüfe ob User eingeloggt ist
  const token = request.cookies.get('auth-token')
  let user = null

  if (token) {
    try {
      const { payload } = await jwtVerify(token.value, SECRET)
      user = payload
    } catch (error) {
      // Token ungültig
    }
  }

  const { pathname } = request.nextUrl

  // Subdomain-Logik (z.B. verag.localhost:3000)
  if (!isMainDomain) {
    // User ist NICHT eingeloggt → Zeige Login
    if (!user && pathname !== '/') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // User ist eingeloggt → Leite / zu /dashboard um
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Hauptdomain-Logik (z.B. localhost:3000)
  if (isMainDomain) {
    // Zeige Landing Page / Registration
    if (pathname === '/') {
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}