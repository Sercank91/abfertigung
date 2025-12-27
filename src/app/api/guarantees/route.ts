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
    return payload as { id: string; tenantId: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

// GET - Alle Bürgschaften abrufen
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    console.log('📋 Lade Bürgschaften für Tenant:', user.tenantId);

    // Bürgschaften mit Firmen-Count laden
    const result = await queryTenant(
      user.tenantId,
      `SELECT 
        g.id,
        g.name,
        g.description,
        g."isActive",
        g."createdAt",
        g."updatedAt",
        COUNT(cg."companyId") as company_count
      FROM "Guarantee" g
      LEFT JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
      WHERE g."tenantId" = $1 AND g."isActive" = true
      GROUP BY g.id
      ORDER BY g.name ASC`,
      [user.tenantId]
    );

    // Format für Frontend
    const guarantees = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        companies: parseInt(row.company_count)
      }
    }));

    console.log('✅ Bürgschaften gefunden:', guarantees.length);

    return NextResponse.json(guarantees);

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bürgschaften:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Bürgschaften' },
      { status: 500 }
    );
  }
}

// POST - Neue Bürgschaft erstellen
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Nur Admin und Schichtleiter
    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Validierung
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('➕ Neue Bürgschaft:', name);

    // Prüfen ob Name bereits existiert
    const existing = await queryTenant(
      user.tenantId,
      'SELECT id FROM "Guarantee" WHERE "tenantId" = $1 AND name = $2',
      [user.tenantId, name.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Eine Bürgschaft mit diesem Namen existiert bereits' },
        { status: 400 }
      );
    }

    // Neue Bürgschaft erstellen
    const result = await queryTenant(
      user.tenantId,
      `INSERT INTO "Guarantee" (
        id,
        "tenantId",
        name,
        description,
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
      RETURNING 
        id,
        name,
        description,
        "isActive",
        "createdAt",
        "updatedAt"`,
      [user.tenantId, name.trim(), description?.trim() || null]
    );

    console.log('✅ Bürgschaft erstellt:', result.rows[0].id);

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Bürgschaft:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Bürgschaft' },
      { status: 500 }
    );
  }
}