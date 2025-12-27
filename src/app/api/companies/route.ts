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

// GET - Alle Firmen abrufen mit Bürgschaften
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    console.log('📋 Lade Firmen für Tenant:', user.tenantId);

    // ✅ FIX: Firmen mit zugeordneten Bürgschaften laden (direkte Struktur für Frontend)
    const result = await queryTenant(
      user.tenantId,
      `SELECT 
        c.id,
        c.name,
        c.country,
        c.address,
        c."postalCode",
        c.city,
        c.emails,
        c.phones,
        c."isActive",
        c."createdAt",
        c."updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', g.id,
              'name', g.name
            ) ORDER BY g.name
          ) FILTER (WHERE g.id IS NOT NULL),
          '[]'
        ) as guarantees
      FROM "Company" c
      LEFT JOIN "CompanyGuarantee" cg ON c.id = cg."companyId"
      LEFT JOIN "Guarantee" g ON cg."guaranteeId" = g.id
      WHERE c."tenantId" = $1
      GROUP BY c.id
      ORDER BY c.name ASC`,
      [user.tenantId]
    );

    console.log('✅ Firmen gefunden:', result.rows.length);

    return NextResponse.json({
      companies: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Firmen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Firmen' },
      { status: 500 }
    );
  }
}

// POST - Neue Firma erstellen
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
    const { 
      name, 
      country, 
      address, 
      postalCode, 
      city, 
      emails, 
      phones, 
      guaranteeIds 
    } = body;

    // Validierung
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Firmenname ist erforderlich' },
        { status: 400 }
      );
    }

    if (!country || !country.trim()) {
      return NextResponse.json(
        { error: 'Land ist erforderlich' },
        { status: 400 }
      );
    }

    if (!guaranteeIds || guaranteeIds.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Bürgschaft muss zugeordnet werden' },
        { status: 400 }
      );
    }

    console.log('➕ Neue Firma:', name);

    // Firma erstellen
    const companyResult = await queryTenant(
      user.tenantId,
      `INSERT INTO "Company" (
        id,
        "tenantId",
        name,
        country,
        address,
        "postalCode",
        city,
        emails,
        phones,
        "isActive",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
      )
      RETURNING 
        id,
        name,
        country,
        address,
        "postalCode",
        city,
        emails,
        phones,
        "isActive",
        "createdAt",
        "updatedAt"`,
      [
        user.tenantId,
        name.trim(),
        country.trim(),
        address?.trim() || '',
        postalCode?.trim() || '',
        city?.trim() || '',
        emails || [],
        phones || []
      ]
    );

    const company = companyResult.rows[0];

    // Bürgschaften verknüpfen (mit tenantId-Validierung für Security)
    for (const guaranteeId of guaranteeIds) {
      await queryTenant(
        user.tenantId,
        `INSERT INTO "CompanyGuarantee" (
          id,
          "companyId",
          "guaranteeId",
          "createdAt"
        ) 
        SELECT gen_random_uuid(), $1, $2, NOW()
        WHERE EXISTS (
          SELECT 1 FROM "Company" WHERE id = $1 AND "tenantId" = $3
        )
        AND EXISTS (
          SELECT 1 FROM "Guarantee" WHERE id = $2 AND "tenantId" = $3
        )`,
        [company.id, guaranteeId, user.tenantId]
      );
    }

    console.log('✅ Firma erstellt:', company.id);

    // ✅ FIX: Bürgschaften für Response laden (im DIREKTEN FORMAT - nicht verschachtelt!)
    const guaranteesResult = await queryTenant(
      user.tenantId,
      `SELECT g.id, g.name 
       FROM "Guarantee" g
       INNER JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
       WHERE cg."companyId" = $1 AND g."tenantId" = $2
       ORDER BY g.name`,
      [company.id, user.tenantId]
    );

    return NextResponse.json(
      { 
        ...company, 
        guarantees: guaranteesResult.rows
      }, 
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Firma:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Firma' },
      { status: 500 }
    );
  }
}