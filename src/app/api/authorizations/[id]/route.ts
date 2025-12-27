import { NextRequest, NextResponse } from 'next/server';
import { queryTenant } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

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

// GET - Einzelne Bewilligung abrufen
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const result = await queryTenant(
      user.tenantId,
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
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Prüfe ob Bewilligung zum Tenant gehört
    const checkAuth = await queryTenant(
      user.tenantId,
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
    const existingAuth = await queryTenant(
      user.tenantId,
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
    const result = await queryTenant(
      user.tenantId,
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

// DELETE - Bewilligung löschen
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Prüfe ob Bewilligung existiert und zum Tenant gehört
    const checkAuth = await queryTenant(
      user.tenantId,
      'SELECT id, name FROM "Authorization" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkAuth.rows.length === 0) {
      return NextResponse.json(
        { error: 'Bewilligung nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    console.log('🗑️ Bewilligung löschen:', params.id);

    // Zähle wie viele Abfertigungen diese Bewilligung verwenden
    const clearanceCount = await queryTenant(
      user.tenantId,
      'SELECT COUNT(*) as count FROM "Clearance" WHERE "authorizationId" = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    const affectedClearances = parseInt(clearanceCount.rows[0].count);

    // Setze authorizationId auf NULL für alle betroffenen Abfertigungen
    if (affectedClearances > 0) {
      await queryTenant(
        user.tenantId,
        'UPDATE "Clearance" SET "authorizationId" = NULL, "updatedAt" = NOW() WHERE "authorizationId" = $1 AND "tenantId" = $2',
        [params.id, user.tenantId]
      );
    }

    // Bewilligung löschen
    await queryTenant(
      user.tenantId,
      'DELETE FROM "Authorization" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    console.log('✅ Bewilligung gelöscht:', checkAuth.rows[0].name);

    return NextResponse.json({
      message: 'Bewilligung erfolgreich gelöscht',
      affectedClearances: affectedClearances
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen der Bewilligung:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Bewilligung' }, { status: 500 });
  }
}