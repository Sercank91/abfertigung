import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.log('❌ Kein auth-token Cookie gefunden')
      return null
    }

    const { payload } = await jwtVerify(token, SECRET)
    console.log('✅ Token verifiziert:', payload)
    return payload as { id: string; tenantId: string; email: string; role: string }
  } catch (error) {
    console.error('❌ Token-Fehler:', error)
    return null
  }
}

// GET - Alle Mitarbeiter abrufen
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    console.log('📋 Lade Mitarbeiter für Tenant:', user.tenantId)

    const result = await pool.query(
      `SELECT 
        id,
        "firstName",
        "lastName",
        "startDate",
        "endDate",
        "monthlyGross",
        "createdAt",
        "updatedAt"
      FROM "Employee" 
      WHERE "tenantId" = $1 
      ORDER BY "lastName", "firstName"`,
      [user.tenantId]
    )

    console.log('✅ Mitarbeiter gefunden:', result.rows.length)

    return NextResponse.json({
      employees: result.rows,
      count: result.rows.length,
    })
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Mitarbeiter:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen der Mitarbeiter' }, { status: 500 })
  }
}

// POST - Neuen Mitarbeiter anlegen
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, startDate, endDate, monthlyGross } = body

    console.log('➕ Neuer Mitarbeiter:', { firstName, lastName })

    // Validierung
    if (!firstName || !lastName || !startDate || !monthlyGross) {
      return NextResponse.json(
        { error: 'Vorname, Nachname, Startdatum und Monatsgehalt sind Pflichtfelder' },
        { status: 400 }
      )
    }

    // Mitarbeiter anlegen
    const result = await pool.query(
      `INSERT INTO "Employee" (
        id,
        "tenantId",
        "firstName",
        "lastName",
        "startDate",
        "endDate",
        "monthlyGross",
        "createdAt",
        "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING 
        id,
        "firstName",
        "lastName",
        "startDate",
        "endDate",
        "monthlyGross",
        "createdAt",
        "updatedAt"`,
      [user.tenantId, firstName, lastName, startDate, endDate || null, parseFloat(monthlyGross)]
    )

    console.log('✅ Mitarbeiter angelegt:', result.rows[0].id)

    return NextResponse.json(
      {
        message: 'Mitarbeiter erfolgreich angelegt',
        employee: result.rows[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Fehler beim Anlegen des Mitarbeiters:', error)
    return NextResponse.json({ error: 'Fehler beim Anlegen des Mitarbeiters' }, { status: 500 })
  }
}
