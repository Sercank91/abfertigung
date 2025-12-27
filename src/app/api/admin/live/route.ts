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
 * GET /api/admin/live
 * 
 * Live-Statistiken: Welche User sind online, auf welchen Seiten
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

    // "Online" = lastSeenAt innerhalb der letzten 2 Minuten (120 Sekunden)
    const onlineThreshold = new Date(Date.now() - 120 * 1000);

    // Hole alle Online-Sessions mit User und Tenant Info
    const onlineSessions = await prisma.userSession.findMany({
      where: {
        lastSeenAt: {
          gte: onlineThreshold
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      },
      orderBy: {
        lastSeenAt: 'desc'
      }
    });

    // Gruppiere nach Tenant
    const byTenant: { [key: string]: any } = {};
    
    for (const session of onlineSessions) {
      const tenantId = session.tenantId;
      
      if (!byTenant[tenantId]) {
        byTenant[tenantId] = {
          tenant: session.tenant,
          onlineUsers: [],
          totalOnline: 0
        };
      }
      
      byTenant[tenantId].onlineUsers.push({
        user: session.user,
        currentPath: session.currentPath,
        lastSeenAt: session.lastSeenAt
      });
      byTenant[tenantId].totalOnline++;
    }

    // Gesamtstatistiken
    const totalOnlineUsers = onlineSessions.length;
    const tenantsWithOnlineUsers = Object.keys(byTenant).length;

    return NextResponse.json({
      totalOnlineUsers,
      tenantsWithOnlineUsers,
      byTenant: Object.values(byTenant)
    });
  } catch (error) {
    console.error('Fehler beim Laden der Live-Daten:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

