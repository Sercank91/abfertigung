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
 * PATCH /api/admin/tenant-data/[tenantId]/routes/[id]
 * Route aktualisieren
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
    const { name, description, countries, transitOfficeIds, isActive } = body;

    // Prüfe ob Route existiert und zum richtigen Tenant gehört
    const existingRoute = await prisma.route.findUnique({
      where: { id: params.id }
    });

    if (!existingRoute) {
      return NextResponse.json(
        { error: 'Route nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingRoute.tenantId !== params.tenantId) {
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
    
    if (countries !== undefined) {
      if (!Array.isArray(countries) || countries.length === 0) {
        return NextResponse.json(
          { error: 'Mindestens ein Land ist erforderlich' },
          { status: 400 }
        );
      }
      updateData.countries = countries;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update mit Transit-Offices
    const route = await prisma.route.update({
      where: { id: params.id },
      data: {
        ...updateData,
        // Wenn transitOfficeIds vorhanden, aktualisiere die Transit-Offices
        ...(transitOfficeIds !== undefined && {
          transitOffices: {
            // Lösche alle alten
            deleteMany: {},
            // Erstelle neue
            create: transitOfficeIds.map((officeId: string, index: number) => ({
              customsOfficeId: officeId,
              order: index + 1
            }))
          }
        })
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

    return NextResponse.json(route);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Route:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/routes/[id]
 * Route löschen
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

    // Prüfe ob Route existiert und zum richtigen Tenant gehört
    const existingRoute = await prisma.route.findUnique({
      where: { id: params.id }
    });

    if (!existingRoute) {
      return NextResponse.json(
        { error: 'Route nicht gefunden' },
        { status: 404 }
      );
    }

    if (existingRoute.tenantId !== params.tenantId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Lösche die Route (CASCADE löscht automatisch RouteTransitOffice Einträge)
    await prisma.route.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Route erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Route:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

