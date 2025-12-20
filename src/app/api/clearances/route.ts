import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { generateNextAnmNr } from '@/lib/anmnr';
import type { UserPayload, ApiResponse, ApiError } from '@/types';

const getSecret = () => getJwtSecret();

/**
 * Extrahiert und validiert den User aus dem JWT-Token
 */
async function getUserFromToken(request: NextRequest): Promise<UserPayload | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as UserPayload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

/**
 * Hilfsfunktion für konsistente Error-Responses
 */
function createErrorResponse(message: string, statusCode: number = 500): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      statusCode,
    },
    { status: statusCode }
  );
}

/**
 * Hilfsfunktion für konsistente Success-Responses
 */
function createSuccessResponse<T>(data: T, message?: string, statusCode: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  );
}

/**
 * GET /api/clearances
 * Ruft alle Clearances für den Tenant ab
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return createErrorResponse('Nicht authentifiziert', 401);
    }

    // Query mit JOINs für Relations - JETZT MIT anmNr!
    const result = await pool.query(
      `SELECT 
        c.id,
        c."anmNr",
        c.lrn,
        c."licensePlate",
        c."licensePlateCountry",
        c.status,
        c."registrationDate",
        c."createdAt",
        c."updatedAt",
        
        -- Company (Firma)
        comp.id as "companyId",
        comp.name as "companyName",
        
        -- Guarantee (Bürgschaft)
        g.id as "guaranteeId",
        g.name as "guaranteeName",
        
        -- Route
        r.id as "routeId",
        r.name as "routeName",
        
        -- Ersteller
        u."firstName" as "createdByFirstName",
        u."lastName" as "createdByLastName"
        
      FROM "Clearance" c
      INNER JOIN "Company" comp ON c."companyId" = comp.id
      INNER JOIN "Guarantee" g ON c."guaranteeId" = g.id
      LEFT JOIN "Route" r ON c."routeId" = r.id
      INNER JOIN "User" u ON c."createdById" = u.id
      WHERE c."tenantId" = $1
      ORDER BY c."anmNr" DESC`,
      [user.tenantId]
    );

    // Transform für Frontend
    const clearances = result.rows.map(row => ({
      id: row.id,
      anmNr: row.anmNr,
      lrn: row.lrn,
      licensePlate: row.licensePlate,
      licensePlateCountry: row.licensePlateCountry,
      status: row.status,
      registrationDate: row.registrationDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: {
        id: row.companyId,
        name: row.companyName,
      },
      guarantee: {
        id: row.guaranteeId,
        name: row.guaranteeName,
      },
      route: row.routeId ? {
        id: row.routeId,
        name: row.routeName,
      } : null,
      createdBy: {
        firstName: row.createdByFirstName,
        lastName: row.createdByLastName,
      },
    }));

    return NextResponse.json({
      clearances,
      count: clearances.length
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Clearances:', error);
    return createErrorResponse(
      'Fehler beim Abrufen der Clearances. Bitte versuchen Sie es später erneut.',
      500
    );
  }
}

/**
 * POST /api/clearances
 * Erstellt eine neue Clearance mit automatischer AnmNr-Generierung
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return createErrorResponse('Nicht authentifiziert', 401);
    }

    const body = await request.json();
    const {
      lrn,
      companyId,
      guaranteeId,
      licensePlate,
      licensePlateCountry,
      hasSecondPlate,
      secondLicensePlate,
      secondPlateCountry,
      routeId,
      simplifiedProcedure,
      goodsLocationId,
      authorizationId,
      departureOfficeId,
      dispatchOfficeId,
      destinationOfficeId,
      registrationDate,
      arrivalDate,
    } = body;

    // Pflichtfeld-Validierung
    const missingFields: string[] = [];
    if (!lrn) missingFields.push('LRN');
    if (!companyId) missingFields.push('Firma');
    if (!guaranteeId) missingFields.push('Bürgschaft');
    if (!licensePlate) missingFields.push('Kennzeichen');
    if (!licensePlateCountry) missingFields.push('Kennzeichen-Land');

    if (missingFields.length > 0) {
      return createErrorResponse(
        `Folgende Pflichtfelder fehlen: ${missingFields.join(', ')}`,
        400
      );
    }

    // Prüfe ob LRN bereits existiert
    const existingLRN = await pool.query(
      'SELECT id FROM "Clearance" WHERE "tenantId" = $1 AND lrn = $2',
      [user.tenantId, lrn]
    );

    if (existingLRN.rows.length > 0) {
      return createErrorResponse('Diese LRN existiert bereits', 400);
    }

    // Vereinfachtes Verfahren Validierung
    if (simplifiedProcedure && (!goodsLocationId || !authorizationId)) {
      return createErrorResponse(
        'Bei vereinfachtem Verfahren sind Warenort und Bewilligung Pflichtfelder',
        400
      );
    }

    // 🔒 SECURITY CHECK (P0): IDOR Prevention
    // Prüfe ob referenzierte Entitäten dem Tenant gehören
    const company = await pool.query(
      'SELECT 1 FROM "Company" WHERE id = $1 AND "tenantId" = $2',
      [companyId, user.tenantId]
    );
    if (company.rowCount === 0) {
      return createErrorResponse('Ungültige Firma (Zugriff verweigert)', 403);
    }

    const guarantee = await pool.query(
      'SELECT 1 FROM "Guarantee" WHERE id = $1 AND "tenantId" = $2',
      [guaranteeId, user.tenantId]
    );
    if (guarantee.rowCount === 0) {
      return createErrorResponse('Ungültige Bürgschaft (Zugriff verweigert)', 403);
    }

    if (routeId) {
      const route = await pool.query(
        'SELECT 1 FROM "Route" WHERE id = $1 AND "tenantId" = $2',
        [routeId, user.tenantId]
      );
      if (route.rowCount === 0) {
        return createErrorResponse('Ungültige Route (Zugriff verweigert)', 403);
      }
    }

    if (goodsLocationId) {
      const goodsLocation = await pool.query(
        'SELECT 1 FROM "GoodsLocation" WHERE id = $1 AND "tenantId" = $2',
        [goodsLocationId, user.tenantId]
      );
      if (goodsLocation.rowCount === 0) {
        return createErrorResponse('Ungültiger Warenort (Zugriff verweigert)', 403);
      }
    }

    if (authorizationId) {
      const authorization = await pool.query(
        'SELECT 1 FROM "Authorization" WHERE id = $1 AND "tenantId" = $2',
        [authorizationId, user.tenantId]
      );
      if (authorization.rowCount === 0) {
        return createErrorResponse('Ungültige Bewilligung (Zugriff verweigert)', 403);
      }
    }

    // ✅ NEU: Generiere Anmeldenummer (Tenant-Scoped)!
    const anmNr = await generateNextAnmNr(user.tenantId);

    // ✅ NEU: Clearance anlegen - MIT anmNr UND ZOLLSTELLEN!
    const result = await pool.query(
      `INSERT INTO "Clearance" (
        id,
        "anmNr",
        "tenantId",
        lrn,
        "companyId",
        "guaranteeId",
        "licensePlate",
        "licensePlateCountry",
        "hasSecondPlate",
        "secondLicensePlate",
        "secondPlateCountry",
        "routeId",
        "simplifiedProcedure",
        "goodsLocationId",
        "authorizationId",
        "departureOfficeId",
        "dispatchOfficeId",
        "destinationOfficeId",
        "registrationDate",
        "arrivalDate",
        status,
        "createdById",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        'in_bearbeitung',
        $20,
        NOW(),
        NOW()
      )
      RETURNING id, "anmNr", lrn, status, "createdAt"`,
      [
        anmNr,
        user.tenantId,
        lrn,
        companyId,
        guaranteeId,
        licensePlate,
        licensePlateCountry,
        hasSecondPlate || false,
        secondLicensePlate || null,
        secondPlateCountry || null,
        routeId || null,
        simplifiedProcedure || false,
        goodsLocationId || null,
        authorizationId || null,
        departureOfficeId || null,    // ✅ NEU
        dispatchOfficeId || null,     // ✅ NEU
        destinationOfficeId || null,  // ✅ NEU
        registrationDate || new Date(),
        arrivalDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 Tage
        user.id, // createdById
      ]
    );

    // History eintragen
    await pool.query(
      `INSERT INTO "ClearanceHistory" (
        id,
        "clearanceId",
        action,
        description,
        "userId",
        "createdAt"
      ) VALUES (
        gen_random_uuid(),
        $1,
        'created',
        $2,
        $3,
        NOW()
      )`,
      [
        result.rows[0].id,
        `Abfertigung erstellt: AnmNr ${anmNr}, LRN ${lrn}`,
        user.id,
      ]
    );

    return NextResponse.json({
      message: 'Clearance erfolgreich angelegt',
      clearance: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Fehler beim Anlegen der Clearance:', error);

    // Spezifische Fehlerbehandlung
    if (error instanceof Error) {
      if (error.message.includes('Konnte keine Anmeldenummer generieren')) {
        return createErrorResponse(
          'Fehler bei der AnmNr-Generierung. Bitte kontaktieren Sie den Support.',
          500
        );
      }

      if (error.message.includes('violates foreign key constraint')) {
        return createErrorResponse(
          'Ein oder mehrere referenzierte Datensätze existieren nicht.',
          400
        );
      }
    }

    return createErrorResponse(
      'Fehler beim Anlegen der Clearance. Bitte versuchen Sie es später erneut.',
      500
    );
  }
}