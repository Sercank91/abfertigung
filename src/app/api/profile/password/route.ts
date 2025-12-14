import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';

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

// PUT - Passwort ändern
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();

    // Validierung
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Bitte alle Felder ausfüllen' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    // Aktuellen Benutzer mit Passwort abrufen
    const userResult = await pool.query(
      'SELECT id, username, password FROM "User" WHERE id = $1 AND "tenantId" = $2',
      [user.id, user.tenantId]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ Benutzer nicht gefunden:', user.id);
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const currentUser = userResult.rows[0];

    console.log('🔐 Passwort-Änderung für:', currentUser.username);

    // Altes Passwort mit bcrypt überprüfen
    const isPasswordValid = await verifyPassword(oldPassword, currentUser.password);
    
    if (!isPasswordValid) {
      console.error('❌ Altes Passwort ist falsch!');
      return NextResponse.json({ error: 'Das alte Kennwort ist falsch' }, { status: 401 });
    }

    // Neues Passwort mit bcrypt hashen
    const hashedPassword = await hashPassword(newPassword);

    // Neues Passwort speichern
    await pool.query(
      `UPDATE "User" 
       SET password = $1, "updatedAt" = NOW()
       WHERE id = $2 AND "tenantId" = $3`,
      [hashedPassword, user.id, user.tenantId]
    );

    console.log('✅ Passwort erfolgreich geändert für:', currentUser.username);

    return NextResponse.json({
      success: true,
      message: 'Kennwort erfolgreich geändert'
    });
  } catch (error) {
    console.error('❌ Password change error:', error);
    return NextResponse.json({ error: 'Fehler beim Ändern des Kennworts' }, { status: 500 });
  }
}