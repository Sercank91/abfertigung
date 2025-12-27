import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/heartbeat
 * 
 * Heartbeat für User Presence Tracking
 * Wird von Client alle 60 Sekunden aufgerufen
 */
export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get('auth-token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token.value, getJwtSecret());
    const userId = (payload as any).id;
    const tenantId = (payload as any).tenantId;

    // Parse Request Body für currentPath
    const body = await request.json();
    const { currentPath } = body;

    // Upsert UserSession
    await prisma.userSession.upsert({
      where: {
        userId_tenantId: {
          userId,
          tenantId
        }
      },
      update: {
        lastSeenAt: new Date(),
        currentPath: currentPath || null
      },
      create: {
        userId,
        tenantId,
        lastSeenAt: new Date(),
        currentPath: currentPath || null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat Fehler:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

