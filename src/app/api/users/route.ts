import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';
import { hashPassword } from '@/lib/password';

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { id: string; tenantId: string; role: string };
  } catch (error) {
    return null;
  }
}

// GET - Alle User abrufen (nur für admin/schichtleiter)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    // Nur admin und schichtleiter dürfen User sehen
    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

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
        "createdAt",
        "updatedAt"
      FROM "User" 
      WHERE "tenantId" = $1 
      ORDER BY "lastName", "firstName"`,
      [user.tenantId]
    );

    return NextResponse.json({
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Benutzer:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Benutzer' }, { status: 500 });
  }
}

// POST - Neuen User anlegen (nur für admin/schichtleiter)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, firstName, lastName, email, phone, role } = body;

    // Validierung
    if (!username || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Benutzername, Passwort, Vorname und Nachname sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Prüfe ob Username bereits existiert
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Dieser Benutzername existiert bereits' },
        { status: 400 }
      );
    }

    // Passwort hashen
    const hashedPassword = await hashPassword(password);

    // User anlegen
    const result = await pool.query(
      `INSERT INTO "User" (
        id,
        "tenantId",
        username,
        password,
        "firstName",
        "lastName",
        email,
        phone,
        role,
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
      RETURNING 
        id, username, email, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt"`,
      [
        user.tenantId,
        username,
        hashedPassword,
        firstName,
        lastName,
        email || null,
        phone || null,
        role || 'mitarbeiter'
      ]
    );

    console.log('✅ User angelegt:', result.rows[0].username);

    return NextResponse.json({
      message: 'Benutzer erfolgreich angelegt',
      user: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Fehler beim Anlegen des Benutzers:', error);
    return NextResponse.json({ error: 'Fehler beim Anlegen des Benutzers' }, { status: 500 });
  }
}