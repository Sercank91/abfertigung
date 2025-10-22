import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  cookies().delete('auth-token')
  
  // Redirect zur Startseite
  return NextResponse.redirect(new URL('/', 'http://localhost:3000'))
}