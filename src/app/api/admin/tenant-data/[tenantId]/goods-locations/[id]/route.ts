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
 * PATCH /api/admin/tenant-data/[tenantId]/goods-locations/[id]
 * Warenort aktualisieren
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

    // Prüfe ob Warenort existiert und zum richtigen Tenant gehört
    const existingLocation = await prisma.goodsLocation.findUnique({
      where: { id: params.id }
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Warenort nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingLocation.tenantId !== params.tenantId) {
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
      updateData.code = code?.trim() || null;
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const goodsLocation = await prisma.goodsLocation.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(goodsLocation);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Warenorts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/goods-locations/[id]
 * Warenort löschen
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

    // Prüfe ob Warenort existiert und zum richtigen Tenant gehört
    const existingLocation = await prisma.goodsLocation.findUnique({
      where: { id: params.id }
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Warenort nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingLocation.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Lösche den Warenort
    await prisma.goodsLocation.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Warenort erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Warenorts:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

