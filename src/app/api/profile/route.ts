import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';

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

// PUT - Profil aktualisieren (E-Mail & Telefon)
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { email, phone } = await request.json();

    // Validierung
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ungültige E-Mail Adresse' }, { status: 400 });
    }

    // E-Mail Duplikat-Check (nur im gleichen Tenant)
    const duplicateCheck = await pool.query(
      `SELECT id FROM "User" 
       WHERE email = $1 AND "tenantId" = $2 AND id != $3`,
      [email, user.tenantId, user.id]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Diese E-Mail wird bereits verwendet' }, { status: 400 });
    }

    // Profil aktualisieren
    const result = await pool.query(
      `UPDATE "User" 
       SET email = $1, phone = $2, "updatedAt" = NOW()
       WHERE id = $3 AND "tenantId" = $4
       RETURNING id, username, email, "firstName", "lastName", phone, role`,
      [email, phone || null, user.id, user.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    console.log('✅ Profil aktualisiert:', result.rows[0].username);

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Profils' }, { status: 500 });
  }
}