import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

const getSecret = () => getJwtSecret();

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

// GET - Einzelnen User abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const result = await pool.query(
      `SELECT 
        id, username, email, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt"
      FROM "User" 
      WHERE id = $1 AND "tenantId" = $2`,
      [params.id, user.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen des Benutzers:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen des Benutzers' }, { status: 500 });
  }
}

// PUT - User bearbeiten
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Prüfe ob User zum Tenant gehört
    const checkUser = await pool.query(
      'SELECT id FROM "User" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { username, password, firstName, lastName, email, phone, role, isActive } = body;

    // Validierung
    if (!username || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Benutzername, Vorname und Nachname sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Prüfe ob Username bereits von anderem User verwendet wird
    const existingUser = await pool.query(
      'SELECT id FROM "User" WHERE username = $1 AND id != $2',
      [username, params.id]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Ein anderer Benutzer verwendet bereits diesen Benutzernamen' },
        { status: 400 }
      );
    }

    // User aktualisieren (mit oder ohne Passwort)
    let query, values;
    
    if (password) {
      // Mit neuem Passwort - hashen!
      const hashedPassword = await hashPassword(password);
      
      query = `UPDATE "User" SET
        username = $1,
        password = $2,
        "firstName" = $3,
        "lastName" = $4,
        email = $5,
        phone = $6,
        role = $7,
        "isActive" = $8,
        "updatedAt" = NOW()
      WHERE id = $9 AND "tenantId" = $10
      RETURNING id, username, email, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt"`;
      
      values = [username, hashedPassword, firstName, lastName, email || null, phone || null, role || 'mitarbeiter', isActive ?? true, params.id, user.tenantId];
    } else {
      // Ohne Passwort-Änderung
      query = `UPDATE "User" SET
        username = $1,
        "firstName" = $2,
        "lastName" = $3,
        email = $4,
        phone = $5,
        role = $6,
        "isActive" = $7,
        "updatedAt" = NOW()
      WHERE id = $8 AND "tenantId" = $9
      RETURNING id, username, email, "firstName", "lastName", phone, role, "isActive", "createdAt", "updatedAt"`;
      
      values = [username, firstName, lastName, email || null, phone || null, role || 'mitarbeiter', isActive ?? true, params.id, user.tenantId];
    }

    const result = await pool.query(query, values);

    return NextResponse.json({
      message: 'Benutzer erfolgreich aktualisiert',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Benutzers:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Benutzers' }, { status: 500 });
  }
}

// DELETE - User löschen/deaktivieren
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Prüfe ob User existiert und zum Tenant gehört
    const checkUser = await pool.query(
      'SELECT id, username FROM "User" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkUser.rows.length === 0) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    // Verhindere dass User sich selbst löscht
    if (params.id === user.id) {
      return NextResponse.json(
        { error: 'Sie können sich nicht selbst löschen' },
        { status: 400 }
      );
    }

    // Soft Delete - setze isActive auf false
    await pool.query(
      'UPDATE "User" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
      [params.id]
    );

    console.log('✅ User deaktiviert:', checkUser.rows[0].username);

    return NextResponse.json({
      message: 'Benutzer wurde deaktiviert'
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des Benutzers:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Benutzers' }, { status: 500 });
  }
}