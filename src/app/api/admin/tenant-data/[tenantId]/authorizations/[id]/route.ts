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
 * PATCH /api/admin/tenant-data/[tenantId]/authorizations/[id]
 * Bewilligung aktualisieren
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; id: string }> }
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
    const { name, code, description, isActive } = body;

    // Validierung: Mindestens ein Feld muss aktualisiert werden
    if (name === undefined && code === undefined && description === undefined && isActive === undefined) {
      return NextResponse.json(
        { error: 'Keine Daten zum Aktualisieren' },
        { status: 400 }
      );
    }

    // Prüfe ob Bewilligung existiert und zum richtigen Tenant gehört
    const existingAuthorization = await prisma.authorization.findUnique({
      where: { id: params.id }
    });

    if (!existingAuthorization) {
      return NextResponse.json(
        { error: 'Bewilligung nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingAuthorization.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Update-Daten vorbereiten
    const updateData: any = {};
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name darf nicht leer sein' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    
    if (code !== undefined) {
      if (!code.trim()) {
        return NextResponse.json(
          { error: 'Code darf nicht leer sein' },
          { status: 400 }
        );
      }
      
      // Prüfe ob Code bereits von anderer Bewilligung verwendet wird
      const codeUpper = code.trim().toUpperCase();
      if (codeUpper !== existingAuthorization.code) {
        const existingCode = await prisma.authorization.findFirst({
          where: {
            tenantId: params.tenantId,
            code: codeUpper,
            id: { not: params.id }
          }
        });

        if (existingCode) {
          return NextResponse.json(
            { error: 'Eine Bewilligung mit diesem Code existiert bereits' },
            { status: 400 }
          );
        }
      }
      
      updateData.code = codeUpper;
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const authorization = await prisma.authorization.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(authorization);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Bewilligung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/authorizations/[id]
 * Bewilligung löschen
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; id: string }> }
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

    // Prüfe ob Bewilligung existiert und zum richtigen Tenant gehört
    const existingAuthorization = await prisma.authorization.findUnique({
      where: { id: params.id }
    });

    if (!existingAuthorization) {
      return NextResponse.json(
        { error: 'Bewilligung nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingAuthorization.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Lösche die Bewilligung
    await prisma.authorization.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Bewilligung erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Bewilligung:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

