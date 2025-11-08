import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; tenantId: string; role: string };
  } catch (error) {
    return null;
  }
}

// GET - Alle Bewilligungen abrufen
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        code,
        "isActive",
        "createdAt",
        "updatedAt"
      FROM "Authorization" 
      WHERE "tenantId" = $1 
      ORDER BY name`,
      [user.tenantId]
    );

    return NextResponse.json({
      authorizations: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bewilligungen:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Bewilligungen' }, { status: 500 });
  }
}

// POST - Neue Bewilligung anlegen (nur für admin/schichtleiter)
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
    const { name, description, code } = body;

    // Validierung
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name und Code sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Prüfe ob Name bereits existiert
    const existingAuth = await pool.query(
      'SELECT id FROM "Authorization" WHERE "tenantId" = $1 AND name = $2',
      [user.tenantId, name]
    );

    if (existingAuth.rows.length > 0) {
      return NextResponse.json(
        { error: 'Eine Bewilligung mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    // Bewilligung anlegen
    const result = await pool.query(
      `INSERT INTO "Authorization" (
        id,
        "tenantId",
        name,
        description,
        code,
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
      RETURNING id, name, description, code, "isActive", "createdAt", "updatedAt"`,
      [user.tenantId, name, description || null, code]
    );

    console.log('✅ Bewilligung angelegt:', result.rows[0].name);

    return NextResponse.json({
      message: 'Bewilligung erfolgreich angelegt',
      authorization: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Fehler beim Anlegen der Bewilligung:', error);
    return NextResponse.json({ error: 'Fehler beim Anlegen der Bewilligung' }, { status: 500 });
  }
}