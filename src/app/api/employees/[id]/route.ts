import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; tenantId: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

// GET - Einzelnen Mitarbeiter abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

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
      WHERE id = $1 AND "tenantId" = $2`,
      [params.id, user.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen des Mitarbeiters:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Mitarbeiters' },
      { status: 500 }
    );
  }
}

// PUT - Mitarbeiter bearbeiten
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Prüfe ob Mitarbeiter zum Tenant gehört
    const checkEmployee = await pool.query(
      'SELECT id FROM "Employee" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkEmployee.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      startDate,
      endDate,
      monthlyGross
    } = body;

    console.log('✏️ Mitarbeiter bearbeiten:', params.id);

    // Validierung
    if (!firstName || !lastName || !startDate || !monthlyGross) {
      return NextResponse.json(
        { error: 'Vorname, Nachname, Startdatum und Monatsgehalt sind Pflichtfelder' },
        { status: 400 }
      );
    }

    // Mitarbeiter aktualisieren
    const result = await pool.query(
      `UPDATE "Employee" SET
        "firstName" = $1,
        "lastName" = $2,
        "startDate" = $3,
        "endDate" = $4,
        "monthlyGross" = $5,
        "updatedAt" = NOW()
      WHERE id = $6 AND "tenantId" = $7
      RETURNING 
        id,
        "firstName",
        "lastName",
        "startDate",
        "endDate",
        "monthlyGross",
        "createdAt",
        "updatedAt"`,
      [
        firstName,
        lastName,
        startDate,
        endDate || null,
        parseFloat(monthlyGross),
        params.id,
        user.tenantId
      ]
    );

    console.log('✅ Mitarbeiter aktualisiert');

    return NextResponse.json({
      message: 'Mitarbeiter erfolgreich aktualisiert',
      employee: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Mitarbeiters:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Mitarbeiters' },
      { status: 500 }
    );
  }
}

// DELETE - Mitarbeiter löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Prüfe ob Mitarbeiter existiert und zum Tenant gehört
    const checkEmployee = await pool.query(
      'SELECT id FROM "Employee" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    if (checkEmployee.rows.length === 0) {
      return NextResponse.json(
        { error: 'Mitarbeiter nicht gefunden oder keine Berechtigung' },
        { status: 404 }
      );
    }

    console.log('🗑️ Mitarbeiter löschen:', params.id);

    // Prüfe ob Mitarbeiter Berechnungen hat
    const hasCalculations = await pool.query(
      'SELECT id FROM "Calculation" WHERE "employeeId" = $1 LIMIT 1',
      [params.id]
    );

    if (hasCalculations.rows.length > 0) {
      return NextResponse.json({
        error: 'Mitarbeiter kann nicht gelöscht werden, da Berechnungen vorhanden sind',
        softDelete: false
      }, { status: 400 });
    }

    // Hard Delete - wenn keine Berechnungen vorhanden
    await pool.query(
      'DELETE FROM "Employee" WHERE id = $1 AND "tenantId" = $2',
      [params.id, user.tenantId]
    );

    console.log('✅ Mitarbeiter gelöscht');

    return NextResponse.json({
      message: 'Mitarbeiter erfolgreich gelöscht',
      softDelete: false
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des Mitarbeiters:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Mitarbeiters' },
      { status: 500 }
    );
  }
}