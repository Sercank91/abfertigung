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
 * GET /api/admin/tenant-data/[tenantId]/routes
 * Liste aller Routen eines Tenants mit Transit-Offices
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const params = await context.params;
  
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const routes = await prisma.route.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: 'asc' },
      include: {
        transitOffices: {
          orderBy: { order: 'asc' },
          include: {
            customsOffice: {
              select: {
                id: true,
                code: true,
                name: true,
                countryCode: true,
                city: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Fehler beim Laden der Routen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenant-data/[tenantId]/routes
 * Neue Route erstellen
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const params = await context.params;
  
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, countries, transitOfficeIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    if (!Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens ein Land ist erforderlich' },
        { status: 400 }
      );
    }

    // Route mit Transit-Offices erstellen
    const route = await prisma.route.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        countries: countries,
        tenantId: params.tenantId,
        isActive: true,
        transitOffices: {
          create: (transitOfficeIds || []).map((officeId: string, index: number) => ({
            customsOfficeId: officeId,
            order: index + 1
          }))
        }
      },
      include: {
        transitOffices: {
          orderBy: { order: 'asc' },
          include: {
            customsOffice: true
          }
        }
      }
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Route:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

