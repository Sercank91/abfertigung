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

// GET /api/routes - Alle Routen des Tenants abrufen
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;

    // Query-Parameter
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Build SQL query
    let query = `
      SELECT 
        r.id, r.name, r.description, r.countries, r."isActive", r."createdAt", r."updatedAt"
      FROM "Route" r
      WHERE r."tenantId" = $1 AND r."isActive" = true
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      query += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY r.name ASC`;

    const routesResult = await pool.query(query, params);

    // Für jede Route die Transit-Offices laden
    const routes = await Promise.all(
      routesResult.rows.map(async (route) => {
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
          [route.id]
        );

        // Transform transit offices
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

        return {
          ...route,
          transitOffices,
        };
      })
    );

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/routes - Neue Route erstellen
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const userRole = user.role;

    // Nur Admin und Schichtleiter dürfen Routen erstellen
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, countries, transitOfficeIds } = body;

    // Validierung
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: 'At least one country is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(transitOfficeIds)) {
      return NextResponse.json(
        { error: 'Transit offices must be an array' },
        { status: 400 }
      );
    }

    // Prüfe ob Name bereits existiert
    const existing = await pool.query(
      'SELECT id FROM "Route" WHERE "tenantId" = $1 AND name = $2',
      [tenantId, name.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Route with this name already exists' },
        { status: 400 }
      );
    }

    // Route erstellen
    const routeResult = await pool.query(
      `INSERT INTO "Route" (id, "tenantId", name, description, countries, "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, name, description, countries, "isActive", "createdAt", "updatedAt"`,
      [tenantId, name.trim(), description?.trim() || null, countries]
    );

    const route = routeResult.rows[0];

    // Transit-Offices erstellen
    if (transitOfficeIds.length > 0) {
      const transitValues = transitOfficeIds.map((officeId: string, index: number) => 
        `(gen_random_uuid(), '${route.id}', '${officeId}', ${index + 1})`
      ).join(', ');

      await pool.query(
        `INSERT INTO "RouteTransitOffice" (id, "routeId", "customsOfficeId", "order")
         VALUES ${transitValues}`
      );
    }

    // Lade die komplette Route mit Transit-Offices
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
      [route.id]
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
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}