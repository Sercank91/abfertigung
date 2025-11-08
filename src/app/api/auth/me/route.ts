import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { pool } from '@/lib/db';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Verify JWT
    const { payload } = await jwtVerify(token.value, SECRET);
    const userId = payload.id as string;

    // Get user from database
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
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId
    });

  } catch (error) {
    console.error('Fehler beim Laden der User-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der User-Daten' },
      { status: 500 }
    );
  }
}