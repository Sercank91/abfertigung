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

// GET - Alle Bewilligungen abrufen
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const result = await queryTenant(
      user.tenantId,
      `SELECT 
        a.id,
        a.name,
        a.description,
        a.code,
        a."isActive",
        a."createdAt",
        a."updatedAt",
        COUNT(c.id) as clearance_count
      FROM "Authorization" a
      LEFT JOIN "Clearance" c ON a.id = c."authorizationId" AND c."tenantId" = $1
      WHERE a."tenantId" = $1 AND a."isActive" = true
      GROUP BY a.id
      ORDER BY a.name`,
      [user.tenantId]
    );

    // Format für Frontend
    const authorizations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        clearances: parseInt(row.clearance_count)
      }
    }));

    return NextResponse.json({
      authorizations: authorizations,
      count: authorizations.length
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
    const existingAuth = await queryTenant(
      user.tenantId,
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
    const result = await queryTenant(
      user.tenantId,
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