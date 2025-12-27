import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Middleware: Prüfe Super-Admin Auth
 */
async function verifyAdminAuth(request: NextRequest) {
  const token = (await cookies()).get('admin-token');
  
  if (!token) {
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token.value, getJwtSecret());
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * GET /api/admin/customs-offices
 * Liste aller aktiven Zollstellen (System-weit, kein Tenant-Filter)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '200');

    let whereClause: any = { isActive: true };

    if (search) {
      whereClause = {
        AND: [
          { isActive: true },
          {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { countryCode: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { searchText: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      };
    }

    const offices = await prisma.customsOffice.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        countryCode: true,
        city: true
      }
    });

    return NextResponse.json({ offices });
  } catch (error) {
    console.error('Fehler beim Laden der Zollstellen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

