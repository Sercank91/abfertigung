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

// PUT /api/goods-locations/[id] - Warenort bearbeiten
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

    // Nur Admin und Schichtleiter dürfen Warenorte bearbeiten
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const locationId = params.id;
    const body = await request.json();
    const { name, code, description } = body;

    // Prüfe ob Warenort existiert und zum Tenant gehört
    const existing = await pool.query(
      'SELECT id FROM "GoodsLocation" WHERE id = $1 AND "tenantId" = $2',
      [locationId, tenantId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Goods location not found' }, { status: 404 });
    }

    // Validierung
    if (name && typeof name !== 'string') {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    // Update
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name.trim());
      paramIndex++;
    }

    if (code !== undefined) {
      updateFields.push(`code = $${paramIndex}`);
      updateValues.push(code?.trim() || null);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    updateFields.push('"updatedAt" = NOW()');
    updateValues.push(locationId);

    if (updateFields.length > 1) {
      const updateQuery = `
        UPDATE "GoodsLocation"
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, code, description, "isActive", "createdAt", "updatedAt"
      `;

      const result = await pool.query(updateQuery, updateValues);
      return NextResponse.json({ goodsLocation: result.rows[0] });
    }

    // Wenn nichts geändert wurde, hole aktuellen Stand
    const result = await pool.query(
      'SELECT id, name, code, description, "isActive", "createdAt", "updatedAt" FROM "GoodsLocation" WHERE id = $1',
      [locationId]
    );

    return NextResponse.json({ goodsLocation: result.rows[0] });
  } catch (error) {
    console.error('Error updating goods location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/goods-locations/[id] - Warenort löschen
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

    // Nur Admin und Schichtleiter dürfen Warenorte löschen
    if (userRole !== 'admin' && userRole !== 'schichtleiter') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const locationId = params.id;

    // Prüfe ob Warenort existiert und zum Tenant gehört
    const existing = await pool.query(
      'SELECT id FROM "GoodsLocation" WHERE id = $1 AND "tenantId" = $2',
      [locationId, tenantId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Goods location not found' }, { status: 404 });
    }

    // Soft Delete
    await pool.query(
      'UPDATE "GoodsLocation" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1',
      [locationId]
    );

    return NextResponse.json({ message: 'Goods location deleted successfully' });
  } catch (error) {
    console.error('Error deleting goods location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}