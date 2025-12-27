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
 * GET /api/admin/tenant-data/[tenantId]/companies
 * Liste aller Firmen eines Tenants
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

    const companies = await prisma.company.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: 'asc' },
      include: {
        guarantees: {
          include: {
            guarantee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            clearances: true,
            guarantees: true
          }
        }
      }
    });

    // Transformiere die Daten für das Frontend
    const transformedCompanies = companies.map(company => ({
      ...company,
      guarantees: company.guarantees.map(cg => cg.guarantee)
    }));

    return NextResponse.json({ companies: transformedCompanies });
  } catch (error) {
    console.error('Fehler beim Laden der Firmen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenant-data/[tenantId]/companies
 * Neue Firma für Tenant erstellen
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
    const { name, country, address, postalCode, city, emails, phones, guaranteeIds } = body;

    if (!name || !country || !address || !postalCode || !city) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

    // Erstelle Firma mit Bürgschaften
    const company = await prisma.company.create({
      data: {
        name,
        country,
        address,
        postalCode,
        city,
        emails: emails || [],
        phones: phones || [],
        tenantId: params.tenantId,
        isActive: true,
        guarantees: guaranteeIds && guaranteeIds.length > 0 ? {
          create: guaranteeIds.map((gId: string) => ({
            guarantee: {
              connect: { id: gId }
            }
          }))
        } : undefined
      },
      include: {
        guarantees: {
          include: {
            guarantee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            clearances: true,
            guarantees: true
          }
        }
      }
    });

    // Transformiere für Frontend
    const transformed = {
      ...company,
      guarantees: company.guarantees.map(cg => cg.guarantee)
    };

    console.log(`✅ Firma erstellt: ${company.name} für Tenant ${params.tenantId}`);

    return NextResponse.json({ company: transformed }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Firma:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

