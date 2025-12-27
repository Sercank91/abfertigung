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
 * PATCH /api/admin/tenant-data/[tenantId]/guarantees/[id]
 * Bürgschaft aktualisieren
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
    const { name, description, isActive } = body;

    // Validierung: Mindestens ein Feld muss aktualisiert werden
    if (name === undefined && description === undefined && isActive === undefined) {
      return NextResponse.json(
        { error: 'Keine Daten zum Aktualisieren' },
        { status: 400 }
      );
    }

    // Prüfe ob Bürgschaft existiert und zum richtigen Tenant gehört
    const existingGuarantee = await prisma.guarantee.findUnique({
      where: { id: params.id }
    });

    if (!existingGuarantee) {
      return NextResponse.json(
        { error: 'Bürgschaft nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingGuarantee.tenantId !== params.tenantId) {
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
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const guarantee = await prisma.guarantee.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(guarantee);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Bürgschaft:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/guarantees/[id]
 * Bürgschaft löschen
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

    // Prüfe ob Bürgschaft existiert und zum richtigen Tenant gehört
    const existingGuarantee = await prisma.guarantee.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            companies: true
          }
        }
      }
    });

    if (!existingGuarantee) {
      return NextResponse.json(
        { error: 'Bürgschaft nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingGuarantee.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Lösche die Bürgschaft (CASCADE löscht auch die Verknüpfungen in CompanyGuarantee)
    await prisma.guarantee.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Bürgschaft erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Bürgschaft:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

