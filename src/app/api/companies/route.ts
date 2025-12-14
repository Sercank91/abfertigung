import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
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
    const result = await pool.query(
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

    // Start Transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Firma erstellen
      const companyResult = await client.query(
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

      // Bürgschaften verknüpfen
      for (const guaranteeId of guaranteeIds) {
        await client.query(
          `INSERT INTO "CompanyGuarantee" (
            id,
            "companyId",
            "guaranteeId",
            "createdAt"
          ) VALUES (gen_random_uuid(), $1, $2, NOW())`,
          [company.id, guaranteeId]
        );
      }

      await client.query('COMMIT');

      console.log('✅ Firma erstellt:', company.id);

      // ✅ FIX: Bürgschaften für Response laden (im DIREKTEN Format - nicht verschachtelt!)
      const guaranteesResult = await client.query(
        `SELECT g.id, g.name 
         FROM "Guarantee" g
         INNER JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
         WHERE cg."companyId" = $1
         ORDER BY g.name`,
        [company.id]
      );

      return NextResponse.json(
        { 
          ...company, 
          guarantees: guaranteesResult.rows
        }, 
        { status: 201 }
      );

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Firma:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Firma' },
      { status: 500 }
    );
  }
}