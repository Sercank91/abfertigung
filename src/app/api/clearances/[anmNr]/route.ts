import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { jwtVerify } from 'jose'
import { isValidAnmNr } from '@/lib/anmnr'

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

// GET - Einzelne Clearance abrufen (per AnmNr!)
export async function GET(request: NextRequest, { params }: { params: { anmNr: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const anmNr = params.anmNr

    // Validiere AnmNr Format
    if (!isValidAnmNr(anmNr)) {
      return NextResponse.json({ error: 'Ungültige Anmeldenummer' }, { status: 400 })
    }

    // ✅ NEU: Clearance mit allen Relations laden - INKL. ZOLLSTELLEN!
    const result = await pool.query(
      `SELECT 
        c.*,
        comp.id as "companyId",
        comp.name as "companyName",
        comp.country as "companyCountry",
        comp.address as "companyAddress",
        comp."postalCode" as "companyPostalCode",
        comp.city as "companyCity",
        g.id as "guaranteeId",
        g.name as "guaranteeName",
        r.id as "routeId",
        r.name as "routeName",
        gl.id as "goodsLocationId",
        gl.name as "goodsLocationName",
        auth.id as "authorizationId",
        auth.name as "authorizationName",
        
        -- ✅ NEU: Zollstellen laden
        co_dep.id as "departureOfficeId",
        co_dep.code as "departureOfficeCode",
        co_dep.name as "departureOfficeName",
        co_dep."countryCode" as "departureOfficeCountry",
        
        co_dis.id as "dispatchOfficeId",
        co_dis.code as "dispatchOfficeCode",
        co_dis.name as "dispatchOfficeName",
        co_dis."countryCode" as "dispatchOfficeCountry",
        
        co_dest.id as "destinationOfficeId",
        co_dest.code as "destinationOfficeCode",
        co_dest.name as "destinationOfficeName",
        co_dest."countryCode" as "destinationOfficeCountry",
        
        u_created."firstName" as "createdByFirstName",
        u_created."lastName" as "createdByLastName",
        u_updated."firstName" as "updatedByFirstName",
        u_updated."lastName" as "updatedByLastName"
      FROM "Clearance" c
      LEFT JOIN "Company" comp ON c."companyId" = comp.id
      LEFT JOIN "Guarantee" g ON c."guaranteeId" = g.id
      LEFT JOIN "Route" r ON c."routeId" = r.id
      LEFT JOIN "GoodsLocation" gl ON c."goodsLocationId" = gl.id
      LEFT JOIN "Authorization" auth ON c."authorizationId" = auth.id
      LEFT JOIN "CustomsOffice" co_dep ON c."departureOfficeId" = co_dep.id
      LEFT JOIN "CustomsOffice" co_dis ON c."dispatchOfficeId" = co_dis.id
      LEFT JOIN "CustomsOffice" co_dest ON c."destinationOfficeId" = co_dest.id
      LEFT JOIN "User" u_created ON c."createdById" = u_created.id
      LEFT JOIN "User" u_updated ON c."updatedById" = u_updated.id
      WHERE c."anmNr" = $1 AND c."tenantId" = $2`,
      [anmNr, user.tenantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Abfertigung nicht gefunden' }, { status: 404 })
    }

    const row = result.rows[0]

    // Formatiere Response mit Company-Details und Zollstellen!
    const clearance = {
      id: row.id,
      anmNr: row.anmNr,
      lrn: row.lrn,
      licensePlate: row.licensePlate,
      licensePlateCountry: row.licensePlateCountry,
      hasSecondPlate: row.hasSecondPlate,
      secondLicensePlate: row.secondLicensePlate,
      secondPlateCountry: row.secondPlateCountry,
      companyId: row.companyId,
      guaranteeId: row.guaranteeId,
      routeId: row.routeId,
      simplifiedProcedure: row.simplifiedProcedure,
      goodsLocationId: row.goodsLocationId,
      authorizationId: row.authorizationId,

      // ✅ NEU: Zollstellen IDs
      departureOfficeId: row.departureOfficeId,
      dispatchOfficeId: row.dispatchOfficeId,
      destinationOfficeId: row.destinationOfficeId,

      registrationDate: row.registrationDate,
      arrivalDate: row.arrivalDate,
      status: row.status,
      tenantId: row.tenantId,
      createdById: row.createdById,
      updatedById: row.updatedById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: row.companyId
        ? {
            id: row.companyId,
            name: row.companyName,
            country: row.companyCountry,
            address: row.companyAddress,
            postalCode: row.companyPostalCode,
            city: row.companyCity,
          }
        : null,
      guarantee: row.guaranteeId
        ? {
            id: row.guaranteeId,
            name: row.guaranteeName,
          }
        : null,
      route: row.routeId
        ? {
            id: row.routeId,
            name: row.routeName,
          }
        : null,
      goodsLocation: row.goodsLocationId
        ? {
            id: row.goodsLocationId,
            name: row.goodsLocationName,
          }
        : null,
      authorization: row.authorizationId
        ? {
            id: row.authorizationId,
            name: row.authorizationName,
          }
        : null,

      // ✅ NEU: Zollstellen-Objekte
      departureOffice: row.departureOfficeId
        ? {
            id: row.departureOfficeId,
            code: row.departureOfficeCode,
            name: row.departureOfficeName,
            countryCode: row.departureOfficeCountry,
          }
        : null,
      dispatchOffice: row.dispatchOfficeId
        ? {
            id: row.dispatchOfficeId,
            code: row.dispatchOfficeCode,
            name: row.dispatchOfficeName,
            countryCode: row.dispatchOfficeCountry,
          }
        : null,
      destinationOffice: row.destinationOfficeId
        ? {
            id: row.destinationOfficeId,
            code: row.destinationOfficeCode,
            name: row.destinationOfficeName,
            countryCode: row.destinationOfficeCountry,
          }
        : null,

      createdBy: row.createdByFirstName
        ? {
            firstName: row.createdByFirstName,
            lastName: row.createdByLastName,
          }
        : null,
      updatedBy: row.updatedByFirstName
        ? {
            firstName: row.updatedByFirstName,
            lastName: row.updatedByLastName,
          }
        : null,
    }

    return NextResponse.json(clearance)
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Abfertigung:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen der Abfertigung' }, { status: 500 })
  }
}

// PUT - Clearance bearbeiten (per AnmNr!)
export async function PUT(request: NextRequest, { params }: { params: { anmNr: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const anmNr = params.anmNr

    // Validiere AnmNr
    if (!isValidAnmNr(anmNr)) {
      return NextResponse.json({ error: 'Ungültige Anmeldenummer' }, { status: 400 })
    }

    // Prüfe ob Clearance existiert
    const checkClearance = await pool.query(
      'SELECT id FROM "Clearance" WHERE "anmNr" = $1 AND "tenantId" = $2',
      [anmNr, user.tenantId]
    )

    if (checkClearance.rows.length === 0) {
      return NextResponse.json({ error: 'Abfertigung nicht gefunden' }, { status: 404 })
    }

    const clearanceId = checkClearance.rows[0].id
    const body = await request.json()

    console.log('✏️ Abfertigung bearbeiten:', anmNr)

    // Map declarationDate zu registrationDate
    const registrationDate = body.registrationDate || body.declarationDate

    // Nimm erste Authorization aus Array wenn vorhanden
    const authorizationId =
      body.authorizationId ||
      (Array.isArray(body.authorizationIds) && body.authorizationIds.length > 0
        ? body.authorizationIds[0]
        : null)

    // Validierung
    if (
      !body.lrn ||
      !body.companyId ||
      !body.guaranteeId ||
      !body.licensePlate ||
      !body.licensePlateCountry
    ) {
      return NextResponse.json(
        { error: 'LRN, Firma, Bürgschaft und Kennzeichen sind Pflichtfelder' },
        { status: 400 }
      )
    }

    // Prüfe ob LRN bereits von anderer Clearance verwendet wird
    const existingLRN = await pool.query(
      'SELECT id FROM "Clearance" WHERE "tenantId" = $1 AND lrn = $2 AND "anmNr" != $3',
      [user.tenantId, body.lrn, anmNr]
    )

    if (existingLRN.rows.length > 0) {
      return NextResponse.json(
        { error: 'Diese LRN wird bereits von einer anderen Abfertigung verwendet' },
        { status: 400 }
      )
    }

    // Vereinfachtes Verfahren Validierung
    if (body.simplifiedProcedure && (!body.goodsLocationId || !authorizationId)) {
      return NextResponse.json(
        { error: 'Bei vereinfachtem Verfahren sind Warenort und Bewilligung Pflichtfelder' },
        { status: 400 }
      )
    }

    // ✅ NEU: UPDATE mit Zollstellen!
    const updateResult = await pool.query(
      `UPDATE "Clearance" SET
        lrn = $1,
        "companyId" = $2,
        "guaranteeId" = $3,
        "licensePlate" = $4,
        "licensePlateCountry" = $5,
        "hasSecondPlate" = $6,
        "secondLicensePlate" = $7,
        "secondPlateCountry" = $8,
        "routeId" = $9,
        "simplifiedProcedure" = $10,
        "goodsLocationId" = $11,
        "authorizationId" = $12,
        "departureOfficeId" = $13,
        "dispatchOfficeId" = $14,
        "destinationOfficeId" = $15,
        "registrationDate" = $16,
        "arrivalDate" = $17,
        status = $18,
        "updatedById" = $19,
        "updatedAt" = NOW()
      WHERE "anmNr" = $20 AND "tenantId" = $21
      RETURNING *`,
      [
        body.lrn,
        body.companyId,
        body.guaranteeId,
        body.licensePlate,
        body.licensePlateCountry,
        body.hasSecondPlate || false,
        body.secondLicensePlate || null,
        body.secondPlateCountry || null,
        body.routeId || null,
        body.simplifiedProcedure || false,
        body.goodsLocationId || null,
        authorizationId || null,
        body.departureOfficeId || null, // ✅ NEU
        body.dispatchOfficeId || null, // ✅ NEU
        body.destinationOfficeId || null, // ✅ NEU
        registrationDate ? new Date(registrationDate) : new Date(),
        body.arrivalDate
          ? new Date(body.arrivalDate)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        body.status || 'in_bearbeitung',
        user.id,
        anmNr,
        user.tenantId,
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
        'updated',
        $2,
        $3,
        NOW()
      )`,
      [clearanceId, `Abfertigung bearbeitet: AnmNr ${anmNr}, LRN ${body.lrn}`, user.id]
    )

    console.log('✅ Abfertigung aktualisiert')

    // Lade vollständige Daten für Response (mit Zollstellen!)
    const fullClearance = await pool.query(
      `SELECT 
        c.*,
        comp.id as "companyId",
        comp.name as "companyName",
        comp.country as "companyCountry",
        comp.address as "companyAddress",
        comp."postalCode" as "companyPostalCode",
        comp.city as "companyCity",
        g.id as "guaranteeId",
        g.name as "guaranteeName",
        r.id as "routeId",
        r.name as "routeName",
        gl.id as "goodsLocationId",
        gl.name as "goodsLocationName",
        auth.id as "authorizationId",
        auth.name as "authorizationName",
        
        -- Zollstellen
        co_dep.id as "departureOfficeId",
        co_dep.code as "departureOfficeCode",
        co_dep.name as "departureOfficeName",
        co_dep."countryCode" as "departureOfficeCountry",
        
        co_dis.id as "dispatchOfficeId",
        co_dis.code as "dispatchOfficeCode",
        co_dis.name as "dispatchOfficeName",
        co_dis."countryCode" as "dispatchOfficeCountry",
        
        co_dest.id as "destinationOfficeId",
        co_dest.code as "destinationOfficeCode",
        co_dest.name as "destinationOfficeName",
        co_dest."countryCode" as "destinationOfficeCountry",
        
        u_created."firstName" as "createdByFirstName",
        u_created."lastName" as "createdByLastName",
        u_updated."firstName" as "updatedByFirstName",
        u_updated."lastName" as "updatedByLastName"
      FROM "Clearance" c
      LEFT JOIN "Company" comp ON c."companyId" = comp.id
      LEFT JOIN "Guarantee" g ON c."guaranteeId" = g.id
      LEFT JOIN "Route" r ON c."routeId" = r.id
      LEFT JOIN "GoodsLocation" gl ON c."goodsLocationId" = gl.id
      LEFT JOIN "Authorization" auth ON c."authorizationId" = auth.id
      LEFT JOIN "CustomsOffice" co_dep ON c."departureOfficeId" = co_dep.id
      LEFT JOIN "CustomsOffice" co_dis ON c."dispatchOfficeId" = co_dis.id
      LEFT JOIN "CustomsOffice" co_dest ON c."destinationOfficeId" = co_dest.id
      LEFT JOIN "User" u_created ON c."createdById" = u_created.id
      LEFT JOIN "User" u_updated ON c."updatedById" = u_updated.id
      WHERE c."anmNr" = $1`,
      [anmNr]
    )

    const row = fullClearance.rows[0]

    return NextResponse.json({
      id: row.id,
      anmNr: row.anmNr,
      lrn: row.lrn,
      licensePlate: row.licensePlate,
      licensePlateCountry: row.licensePlateCountry,
      hasSecondPlate: row.hasSecondPlate,
      secondLicensePlate: row.secondLicensePlate,
      secondPlateCountry: row.secondPlateCountry,
      companyId: row.companyId,
      guaranteeId: row.guaranteeId,
      routeId: row.routeId,
      simplifiedProcedure: row.simplifiedProcedure,
      goodsLocationId: row.goodsLocationId,
      authorizationId: row.authorizationId,
      departureOfficeId: row.departureOfficeId,
      dispatchOfficeId: row.dispatchOfficeId,
      destinationOfficeId: row.destinationOfficeId,
      registrationDate: row.registrationDate,
      arrivalDate: row.arrivalDate,
      status: row.status,
      tenantId: row.tenantId,
      createdById: row.createdById,
      updatedById: row.updatedById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      company: row.companyId
        ? {
            id: row.companyId,
            name: row.companyName,
            country: row.companyCountry,
            address: row.companyAddress,
            postalCode: row.companyPostalCode,
            city: row.companyCity,
          }
        : null,
      guarantee: row.guaranteeId
        ? {
            id: row.guaranteeId,
            name: row.guaranteeName,
          }
        : null,
      route: row.routeId
        ? {
            id: row.routeId,
            name: row.routeName,
          }
        : null,
      goodsLocation: row.goodsLocationId
        ? {
            id: row.goodsLocationId,
            name: row.goodsLocationName,
          }
        : null,
      authorization: row.authorizationId
        ? {
            id: row.authorizationId,
            name: row.authorizationName,
          }
        : null,
      departureOffice: row.departureOfficeId
        ? {
            id: row.departureOfficeId,
            code: row.departureOfficeCode,
            name: row.departureOfficeName,
            countryCode: row.departureOfficeCountry,
          }
        : null,
      dispatchOffice: row.dispatchOfficeId
        ? {
            id: row.dispatchOfficeId,
            code: row.dispatchOfficeCode,
            name: row.dispatchOfficeName,
            countryCode: row.dispatchOfficeCountry,
          }
        : null,
      destinationOffice: row.destinationOfficeId
        ? {
            id: row.destinationOfficeId,
            code: row.destinationOfficeCode,
            name: row.destinationOfficeName,
            countryCode: row.destinationOfficeCountry,
          }
        : null,
      createdBy: row.createdByFirstName
        ? {
            firstName: row.createdByFirstName,
            lastName: row.createdByLastName,
          }
        : null,
      updatedBy: row.updatedByFirstName
        ? {
            firstName: row.updatedByFirstName,
            lastName: row.updatedByLastName,
          }
        : null,
    })
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Abfertigung:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Abfertigung' },
      { status: 500 }
    )
  }
}

// DELETE - Clearance löschen (per AnmNr!)
export async function DELETE(request: NextRequest, { params }: { params: { anmNr: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Nur Admin darf löschen
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Keine Berechtigung zum Löschen. Nur Administratoren können Abfertigungen löschen.',
        },
        { status: 403 }
      )
    }

    const anmNr = params.anmNr

    // Validiere AnmNr
    if (!isValidAnmNr(anmNr)) {
      return NextResponse.json({ error: 'Ungültige Anmeldenummer' }, { status: 400 })
    }

    // Prüfe ob Clearance existiert
    const checkClearance = await pool.query(
      'SELECT id, lrn FROM "Clearance" WHERE "anmNr" = $1 AND "tenantId" = $2',
      [anmNr, user.tenantId]
    )

    if (checkClearance.rows.length === 0) {
      return NextResponse.json({ error: 'Abfertigung nicht gefunden' }, { status: 404 })
    }

    const clearance = checkClearance.rows[0]

    console.log('🗑️ Abfertigung löschen:', anmNr)

    // History eintragen vor dem Löschen
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
        'deleted',
        $2,
        $3,
        NOW()
      )`,
      [clearance.id, `Abfertigung gelöscht: AnmNr ${anmNr}, LRN ${clearance.lrn}`, user.id]
    )

    // Clearance löschen
    await pool.query('DELETE FROM "Clearance" WHERE "anmNr" = $1 AND "tenantId" = $2', [
      anmNr,
      user.tenantId,
    ])

    console.log('✅ Abfertigung gelöscht')

    return NextResponse.json({
      message: 'Abfertigung erfolgreich gelöscht',
    })
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Abfertigung:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Abfertigung' }, { status: 500 })
  }
}
