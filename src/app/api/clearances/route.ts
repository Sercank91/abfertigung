import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { jwtVerify } from 'jose'
import { generateNextAnmNr } from '@/lib/anmnr'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as {
      id: string
      tenantId: string
      role: string
      firstName: string
      lastName: string
    }
  } catch (error) {
    return null
  }
}

// GET - Alle Clearances abrufen (mit AnmNr!)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
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
    )

    // Transform für Frontend
    const clearances = result.rows.map((row) => ({
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
      route: row.routeId
        ? {
            id: row.routeId,
            name: row.routeName,
          }
        : null,
      createdBy: {
        firstName: row.createdByFirstName,
        lastName: row.createdByLastName,
      },
    }))

    return NextResponse.json({
      clearances,
      count: clearances.length,
    })
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Abfertigungen:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen der Abfertigungen' }, { status: 500 })
  }
}

// POST - Neue Clearance anlegen (mit automatischer AnmNr-Generierung!)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
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
      departureOfficeId, // ✅ NEU
      dispatchOfficeId, // ✅ NEU
      destinationOfficeId, // ✅ NEU
      registrationDate,
      arrivalDate,
    } = body

    // Validierung
    if (!lrn || !companyId || !guaranteeId || !licensePlate || !licensePlateCountry) {
      return NextResponse.json(
        { error: 'LRN, Firma, Bürgschaft und Kennzeichen sind Pflichtfelder' },
        { status: 400 }
      )
    }

    // Prüfe ob LRN bereits existiert
    const existingLRN = await pool.query(
      'SELECT id FROM "Clearance" WHERE "tenantId" = $1 AND lrn = $2',
      [user.tenantId, lrn]
    )

    if (existingLRN.rows.length > 0) {
      return NextResponse.json({ error: 'Diese LRN existiert bereits' }, { status: 400 })
    }

    // Vereinfachtes Verfahren Validierung
    if (simplifiedProcedure && (!goodsLocationId || !authorizationId)) {
      return NextResponse.json(
        { error: 'Bei vereinfachtem Verfahren sind Warenort und Bewilligung Pflichtfelder' },
        { status: 400 }
      )
    }

    // ✅ NEU: Generiere Anmeldenummer!
    const anmNr = await generateNextAnmNr()

    console.log(`🎯 Neue Clearance: AnmNr ${anmNr}, LRN ${lrn}`)

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
        departureOfficeId || null, // ✅ NEU
        dispatchOfficeId || null, // ✅ NEU
        destinationOfficeId || null, // ✅ NEU
        registrationDate || new Date(),
        arrivalDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 Tage
        user.id, // createdById
      ]
    )

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
      [result.rows[0].id, `Abfertigung erstellt: AnmNr ${anmNr}, LRN ${lrn}`, user.id]
    )

    console.log('✅ Clearance angelegt:', result.rows[0].anmNr)

    return NextResponse.json(
      {
        message: 'Abfertigung erfolgreich angelegt',
        clearance: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Fehler beim Anlegen der Abfertigung:', error)
    return NextResponse.json({ error: 'Fehler beim Anlegen der Abfertigung' }, { status: 500 })
  }
}
