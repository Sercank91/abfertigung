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

// GET - Einzelne Firma abrufen
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Firma mit Bürgschaften laden
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
      WHERE c.id = $1 AND c."tenantId" = $2
      GROUP BY c.id`,
      [params.id, user.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Firma:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Firma' },
      { status: 500 }
    );
  }
}

// PUT - Firma bearbeiten
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
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

    // Prüfe ob Firma existiert
    const checkCompany = await queryTenant(
      user.tenantId,
      'SELECT id FROM "Company" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkCompany.rows.length === 0) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
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
      guaranteeIds,
      isActive
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

    // ✅ FIX: Filtere null/undefined Werte aus guaranteeIds
    const validGuaranteeIds = Array.isArray(guaranteeIds) 
      ? guaranteeIds.filter(id => id != null && id !== '') 
      : [];

    if (validGuaranteeIds.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens eine Bürgschaft muss zugeordnet werden' },
        { status: 400 }
      );
    }

    console.log('✏️ Firma bearbeiten:', params.id);
    console.log('📋 Gültige Bürgschaften-IDs:', validGuaranteeIds);

    // Firma aktualisieren
    const companyResult = await queryTenant(
      user.tenantId,
        `UPDATE "Company" SET
          name = $1,
          country = $2,
          address = $3,
          "postalCode" = $4,
          city = $5,
          emails = $6,
          phones = $7,
          "isActive" = $8,
          "updatedAt" = NOW()
        WHERE id = $9 AND "tenantId" = $10
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
          name.trim(),
          country.trim(),
          address?.trim() || '',
          postalCode?.trim() || '',
          city?.trim() || '',
          emails || [],
          phones || [],
          isActive !== undefined ? isActive : true,
          params.id,
          user.tenantId
        ]
      );

    const company = companyResult.rows[0];

    // Alte Bürgschaften-Verknüpfungen löschen (mit tenantId-Filter für Security)
    await queryTenant(
      user.tenantId,
      `DELETE FROM "CompanyGuarantee" 
       WHERE "companyId" = $1 
       AND "companyId" IN (
         SELECT id FROM "Company" WHERE "tenantId" = $2
       )`,
      [params.id, user.tenantId]
    );

    // ✅ FIX: Neue Bürgschaften verknüpfen - nur gültige IDs
    // Mit tenantId-Validierung für Security
    for (const guaranteeId of validGuaranteeIds) {
      console.log('🔗 Verknüpfe Bürgschaft:', guaranteeId);
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
        [params.id, guaranteeId, user.tenantId]
      );
    }

    console.log('✅ Firma aktualisiert');

    // Bürgschaften für Response laden
    const guaranteesResult = await queryTenant(
      user.tenantId,
      `SELECT g.id, g.name 
       FROM "Guarantee" g
       INNER JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
       WHERE cg."companyId" = $1 AND g."tenantId" = $2
       ORDER BY g.name`,
      [params.id, user.tenantId]
    );

    return NextResponse.json({
      ...company,
      guarantees: guaranteesResult.rows
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Firma:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Firma' },
      { status: 500 }
    );
  }
}

// DELETE - Firma löschen
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
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

    // Prüfe ob Firma existiert
    const checkCompany = await queryTenant(
      user.tenantId,
      'SELECT id FROM "Company" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkCompany.rows.length === 0) {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }

    console.log('🗑️ Firma löschen:', params.id);

    // Firma löschen (Cascade löscht automatisch CompanyGuarantee Einträge)
    await queryTenant(
      user.tenantId,
      'DELETE FROM "Company" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    console.log('✅ Firma gelöscht');

    return NextResponse.json({
      message: 'Firma erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen der Firma:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Firma' },
      { status: 500 }
    );
  }
}