import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

/**
 * GET /api/admin/me
 *
 * Gibt aktuellen Super-Admin User zurück
 */
export async function GET(request: NextRequest) {
  try {
    const SECRET = getJwtSecret();
    const token = (await cookies()).get('admin-token');

    if (!token) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token.value, SECRET);

    return NextResponse.json({
      user: {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: payload.role
      }
    });
  } catch (error) {
    console.error('Admin /me Fehler:', error);
    return NextResponse.json(
      { error: 'Ungültiges Token' },
      { status: 401 }
    );
  }
}

