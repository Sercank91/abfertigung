import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { id: string; tenantId: string; role: string };
  } catch (error) {
    return null;
  }
}

// PUT /api/routes/[id] - Route bearbeiten
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const userRole = user.role;

    // Nur Admin und Schichtleiter dürfen Routen bearbeiten
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const routeId = params.id;
    const body = await request.json();
    const { name, description, countries, transitOfficeIds } = body;

    // Prüfe ob Route existiert und zum Tenant gehört
    const existingRoute = await pool.query(
      'SELECT id FROM "Route" WHERE id = $1 AND "tenantId" = $2',
      [routeId, tenantId]
    );

    if (existingRoute.rows.length === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Validierung
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    if (countries && !Array.isArray(countries)) {
      return NextResponse.json(
        { error: 'Countries must be an array' },
        { status: 400 }
      );
    }

    // Update Route
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (countries) {
      updateFields.push(`countries = $${paramIndex}`);
      updateValues.push(countries);
      paramIndex++;
    }

    updateFields.push('"updatedAt" = NOW()');
    updateValues.push(routeId);

    if (updateFields.length > 1) { // mehr als nur updatedAt
      const updateQuery = `
        UPDATE "Route"
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, description, countries, "isActive", "createdAt", "updatedAt"
      `;

      await pool.query(updateQuery, updateValues);
    }

    // Update Transit-Offices wenn angegeben
    if (transitOfficeIds && Array.isArray(transitOfficeIds)) {
      // Lösche alte Transit-Offices
      await pool.query(
        'DELETE FROM "RouteTransitOffice" WHERE "routeId" = $1',
        [routeId]
      );

      // Erstelle neue Transit-Offices
      if (transitOfficeIds.length > 0) {
        const transitValues = transitOfficeIds.map((officeId: string, index: number) => 
          `(gen_random_uuid(), '${routeId}', '${officeId}', ${index + 1})`
        ).join(', ');

        await pool.query(
          `INSERT INTO "RouteTransitOffice" (id, "routeId", "customsOfficeId", "order")
           VALUES ${transitValues}`
        );
      }
    }

    // Lade die aktualisierte Route mit Transit-Offices
    const routeResult = await pool.query(
      'SELECT id, name, description, countries, "isActive", "createdAt", "updatedAt" FROM "Route" WHERE id = $1',
      [routeId]
    );

    const route = routeResult.rows[0];

    const transitResult = await pool.query(
      `SELECT 
        rto.id, rto."order",
        co.id as "customsOffice.id",
        co.code as "customsOffice.code",
        co.name as "customsOffice.name",
        co."countryCode" as "customsOffice.countryCode",
        co.city as "customsOffice.city"
      FROM "RouteTransitOffice" rto
      JOIN "CustomsOffice" co ON rto."customsOfficeId" = co.id
      WHERE rto."routeId" = $1
      ORDER BY rto."order" ASC`,
      [routeId]
    );

    const transitOffices = transitResult.rows.map((row) => ({
      id: row.id,
      order: row.order,
      customsOffice: {
        id: row['customsOffice.id'],
        code: row['customsOffice.code'],
        name: row['customsOffice.name'],
        countryCode: row['customsOffice.countryCode'],
        city: row['customsOffice.city'],
      },
    }));

    return NextResponse.json({ 
      route: {
        ...route,
        transitOffices,
      }
    });
  } catch (error) {
    console.error('Error updating route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/routes/[id] - Route löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const userRole = user.role;

    // Nur Admin und Schichtleiter dürfen Routen löschen
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const routeId = params.id;

    // Prüfe ob Route existiert und zum Tenant gehört
    const existingRoute = await pool.query(
      'SELECT id FROM "Route" WHERE id = $1 AND "tenantId" = $2',
      [routeId, tenantId]
    );

    if (existingRoute.rows.length === 0) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Soft Delete (isActive = false)
    await pool.query(
      'UPDATE "Route" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
      [routeId]
    );

    return NextResponse.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}