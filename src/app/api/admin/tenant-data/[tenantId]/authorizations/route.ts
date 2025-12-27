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
 * GET /api/admin/tenant-data/[tenantId]/authorizations
 * Liste aller Bewilligungen eines Tenants
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

    const authorizations = await prisma.authorization.findMany({
      where: { tenantId: params.tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true
      }
    });

    return NextResponse.json({ authorizations });
  } catch (error) {
    console.error('Fehler beim Laden der Bewilligungen:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenant-data/[tenantId]/authorizations
 * Neue Bewilligung erstellen
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
    const { name, code, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Code ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob Code bereits existiert
    const existingCode = await prisma.authorization.findFirst({
      where: {
        tenantId: params.tenantId,
        code: code.trim().toUpperCase()
      }
    });

    if (existingCode) {
      return NextResponse.json(
        { error: 'Eine Bewilligung mit diesem Code existiert bereits' },
        { status: 400 }
      );
    }

    const authorization = await prisma.authorization.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        tenantId: params.tenantId,
        isActive: true
      }
    });

    return NextResponse.json(authorization, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen der Bewilligung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

