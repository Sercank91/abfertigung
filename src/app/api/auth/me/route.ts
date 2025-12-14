import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUserFromToken } from '@/lib/api-auth';
/**
 * GET /api/auth/me
 *
 * Gibt die aktuellen User-Daten zurück (frisch aus der DB).
 * Wird verwendet um User-Profil zu laden.
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Nutze zentrale Auth-Funktion
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        "firstName",
        "lastName",
        phone,
        role,
        "isActive",
        "tenantId"
      FROM "User"
      WHERE id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      );
    }

    const dbUser = result.rows[0];

    return NextResponse.json({
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone,
      role: dbUser.role,
      isActive: dbUser.isActive,
      tenantId: dbUser.tenantId
    });

  } catch (error) {
    console.error('Fehler beim Laden der User-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der User-Daten' },
      { status: 500 }
    );
  }
}