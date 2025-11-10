import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { id: string; tenantId: string; email: string; role: string }
  } catch (error) {
    return null
  }
}

// GET - Einzelne Bürgschaft abrufen
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        "isActive",
        "createdAt",
        "updatedAt"
      FROM "Guarantee"
      WHERE id = $1 AND "tenantId" = $2`,
      [params.id, user.tenantId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bürgschaft nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bürgschaft:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen der Bürgschaft' }, { status: 500 })
  }
}

// PUT - Bürgschaft bearbeiten
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Nur Admin und Schichtleiter
    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Prüfe ob Bürgschaft existiert
    const checkGuarantee = await pool.query(
      'SELECT id, name FROM "Guarantee" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    )

    if (checkGuarantee.rows.length === 0) {
      return NextResponse.json({ error: 'Bürgschaft nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, isActive } = body

    // Validierung
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    console.log('✏️ Bürgschaft bearbeiten:', params.id)

    // Prüfen ob neuer Name bereits existiert (außer bei gleicher ID)
    if (name !== checkGuarantee.rows[0].name) {
      const duplicate = await pool.query(
        'SELECT id FROM "Guarantee" WHERE "tenantId" = $1 AND name = $2 AND id != $3',
        [user.tenantId, name.trim(), params.id]
      )

      if (duplicate.rows.length > 0) {
        return NextResponse.json(
          { error: 'Eine Bürgschaft mit diesem Namen existiert bereits' },
          { status: 400 }
        )
      }
    }

    // Bürgschaft aktualisieren
    const result = await pool.query(
      `UPDATE "Guarantee" SET
        name = $1,
        description = $2,
        "isActive" = $3,
        "updatedAt" = NOW()
      WHERE id = $4 AND "tenantId" = $5
      RETURNING 
        id,
        name,
        description,
        "isActive",
        "createdAt",
        "updatedAt"`,
      [
        name.trim(),
        description?.trim() || null,
        isActive !== undefined ? isActive : true,
        params.id,
        user.tenantId,
      ]
    )

    console.log('✅ Bürgschaft aktualisiert')

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Bürgschaft:', error)
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Bürgschaft' }, { status: 500 })
  }
}

// DELETE - Bürgschaft löschen
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // Nur Admin und Schichtleiter
    if (user.role !== 'admin' && user.role !== 'schichtleiter') {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

    // Prüfe ob Bürgschaft existiert
    const checkGuarantee = await pool.query(
      'SELECT id FROM "Guarantee" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    )

    if (checkGuarantee.rows.length === 0) {
      return NextResponse.json({ error: 'Bürgschaft nicht gefunden' }, { status: 404 })
    }

    console.log('🗑️ Bürgschaft löschen:', params.id)

    // Zähle wie viele Firmen betroffen sind
    const companyCount = await pool.query(
      'SELECT COUNT(*) as count FROM "CompanyGuarantee" WHERE "guaranteeId" = $1',
      [params.id]
    )

    const affectedCompanies = parseInt(companyCount.rows[0].count)

    // Bürgschaft löschen (Cascade löscht automatisch CompanyGuarantee Einträge)
    await pool.query('DELETE FROM "Guarantee" WHERE id = $1 AND "tenantId" = $2', [
      params.id,
      user.tenantId,
    ])

    console.log('✅ Bürgschaft gelöscht')

    return NextResponse.json({
      message: 'Bürgschaft erfolgreich gelöscht',
      affectedCompanies: affectedCompanies,
    })
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Bürgschaft:', error)
    return NextResponse.json({ error: 'Fehler beim Löschen der Bürgschaft' }, { status: 500 })
  }
}
