import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { jwtVerify } from 'jose';

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

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

// GET /api/customs-offices - Zollämter abrufen (mit verbesserter Suche)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query-Parameter
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const countryCode = searchParams.get('countryCode') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build SQL query
    let query = `
      SELECT 
        id, code, name, "countryCode", city, address
      FROM "CustomsOffice"
      WHERE "isActive" = true
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by country
    if (countryCode) {
      query += ` AND "countryCode" = $${paramIndex}`;
      params.push(countryCode);
      paramIndex++;
    }

    // Search filter mit searchText (enthält transliterierte Werte)
    if (search) {
        query += ` AND (
        code ILIKE $${paramIndex} OR 
        name ILIKE $${paramIndex} OR 
        city ILIKE $${paramIndex} OR
        "searchText" ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    // Bessere Sortierung: Treffer am Anfang zuerst
    if (search) {
      query += ` ORDER BY 
        CASE 
          WHEN code ILIKE $${paramIndex} THEN 1
          WHEN name ILIKE $${paramIndex} THEN 2
          WHEN city ILIKE $${paramIndex} THEN 3
          ELSE 4
        END,
        "countryCode" ASC, 
        code ASC 
        LIMIT $${paramIndex + 1}`;
      params.push(`${search}%`); // Starts with
      params.push(limit);
    } else {
      query += ` ORDER BY "countryCode" ASC, code ASC LIMIT $${paramIndex}`;
      params.push(limit);
    }

    const result = await pool.query(query, params); // ✅ ERST definieren
    console.log('🔍 Suche:', search, '| Ergebnisse:', result.rows.length); // ✅ DANN verwenden

    return NextResponse.json({ offices: result.rows });
  } catch (error) {
    console.error('❌ Error fetching customs offices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}