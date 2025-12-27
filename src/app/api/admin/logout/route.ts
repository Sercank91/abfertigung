import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/logout
 *
 * Super-Admin Logout
 */
export async function POST(request: NextRequest) {
  try {
    // Cookie löschen
    (await cookies()).delete('admin-token');

    return NextResponse.json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
  } catch (error) {
    console.error('Admin Logout Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

