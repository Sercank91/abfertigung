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

// GET - Einzelne Bewilligung abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT id, name, description, code, "isActive", "createdAt", "updatedAt"
      FROM "Authorization" 
      WHERE id = $1 AND "tenantId" = $2`,
      [params.id, user.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bewilligung nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ authorization: result.rows[0] });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bewilligung:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Bewilligung' }, { status: 500 });
  }
}

// PUT - Bewilligung bearbeiten
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

    // Prüfe ob Bewilligung zum Tenant gehört
    const checkAuth = await pool.query(
      'SELECT id FROM "Authorization" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkAuth.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bewilligung nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, code, isActive } = body;

    // Validierung
    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name und Code sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Prüfe ob Name bereits von anderer Bewilligung verwendet wird
    const existingAuth = await pool.query(
      'SELECT id FROM "Authorization" WHERE "tenantId" = $1 AND name = $2 AND id != $3',
      [user.tenantId, name, params.id]
    );

    if (existingAuth.rows.length > 0) {
      return NextResponse.json(
        { error: 'Eine andere Bewilligung verwendet bereits diesen Namen' },
        { status: 400 }
      );
    }

    // Bewilligung aktualisieren
    const result = await pool.query(
      `UPDATE "Authorization" SET
        name = $1,
        description = $2,
        code = $3,
        "isActive" = $4,
        "updatedAt" = NOW()
      WHERE id = $5 AND "tenantId" = $6
      RETURNING id, name, description, code, "isActive", "createdAt", "updatedAt"`,
      [name, description || null, code, isActive ?? true, params.id, user.tenantId]
    );

    return NextResponse.json({
      message: 'Bewilligung erfolgreich aktualisiert',
      authorization: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Bewilligung:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Bewilligung' }, { status: 500 });
  }
}

// DELETE - Bewilligung löschen/deaktivieren
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

    // Prüfe ob Bewilligung existiert und zum Tenant gehört
    const checkAuth = await pool.query(
      'SELECT id, name FROM "Authorization" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkAuth.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bewilligung nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    // Soft Delete - setze isActive auf false
    await pool.query(
      'UPDATE "Authorization" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
      [params.id]
    );

    console.log('✅ Bewilligung deaktiviert:', checkAuth.rows[0].name);

    return NextResponse.json({
      message: 'Bewilligung wurde deaktiviert'
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen der Bewilligung:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Bewilligung' }, { status: 500 });
  }
}