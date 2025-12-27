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
 * GET /api/admin/tenants
 * Liste aller Tenants
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

    const tenants = await prisma.tenant.findMany({
      where: {
        status: {
          not: 'deleted' // Zeige keine gelöschten Tenants
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            companies: true,
            clearances: true
          }
        }
      }
    });

    // Berechne Online-Mitarbeiter für jeden Tenant
    const tenantsWithOnlineCount = await Promise.all(
      tenants.map(async (tenant) => {
        // Zähle aktive Sessions in den letzten 5 Minuten
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineUsers = await prisma.userSession.count({
          where: {
            tenantId: tenant.id,
            lastSeenAt: {
              gte: fiveMinutesAgo
            }
          }
        });

        return {
          ...tenant,
          _count: {
            ...tenant._count,
            onlineUsers
          }
        };
      })
    );

    return NextResponse.json({ tenants: tenantsWithOnlineCount });
  } catch (error) {
    console.error('Fehler beim Laden der Tenants:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenants
 * Neuen Tenant erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, domain } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name und Domain sind erforderlich' },
        { status: 400 }
      );
    }

    // Validiere Domain-Format (nur lowercase, alphanumerisch und Bindestriche)
    const domainRegex = /^[a-z0-9-]+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Domain darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' },
        { status: 400 }
      );
    }

    // Prüfe ob Domain bereits existiert
    const existing = await prisma.tenant.findUnique({
      where: { domain }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Diese Domain existiert bereits' },
        { status: 409 }
      );
    }

    // Erstelle Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        domain,
        status: 'active'
      }
    });

    console.log(`✅ Tenant erstellt: ${tenant.name} (${tenant.domain})`);

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Tenants:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

