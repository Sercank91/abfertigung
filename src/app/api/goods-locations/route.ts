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
    return payload as { id: string; tenantId: string; role: string };
  } catch (error) {
    return null;
  }
}

// GET /api/goods-locations - Alle Warenorte des Tenants abrufen
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
        id, name, code, description, "isActive", "createdAt", "updatedAt"
      FROM "GoodsLocation"
      WHERE "tenantId" = $1 AND "isActive" = true
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    return NextResponse.json({ goodsLocations: result.rows });
  } catch (error) {
    console.error('Error fetching goods locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/goods-locations - Neuen Warenort erstellen
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const userRole = user.role;

    // Nur Admin und Schichtleiter dürfen Warenorte erstellen
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, description } = body;

    // Validierung
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Prüfe ob Name bereits existiert
    const existing = await pool.query(
      'SELECT id FROM "GoodsLocation" WHERE "tenantId" = $1 AND name = $2',
      [tenantId, name.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Goods location with this name already exists' },
        { status: 400 }
      );
    }

    // Warenort erstellen
    const result = await pool.query(
      `INSERT INTO "GoodsLocation" (id, "tenantId", name, code, description, "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id, name, code, description, "isActive", "createdAt", "updatedAt"`,
      [tenantId, name.trim(), code?.trim() || null, description?.trim() || null]
    );

    return NextResponse.json({ goodsLocation: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating goods location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}