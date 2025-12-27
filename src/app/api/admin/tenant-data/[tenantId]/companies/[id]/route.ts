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
 * PATCH /api/admin/tenant-data/[tenantId]/companies/[id]
 * Firma aktualisieren
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; id: string }> }
) {
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      console.error('PATCH companies: Nicht autorisiert');
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const body = await request.json();
    console.log('PATCH companies body:', body);
    console.log('PATCH companies params:', params);
    
    const { name, country, address, postalCode, city, emails, phones, isActive, guaranteeIds } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (country !== undefined) updateData.country = country;
    if (address !== undefined) updateData.address = address;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (city !== undefined) updateData.city = city;
    if (emails !== undefined) updateData.emails = emails;
    if (phones !== undefined) updateData.phones = phones;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update Bürgschaften wenn guaranteeIds vorhanden
    if (guaranteeIds !== undefined) {
      // Lösche alle bestehenden Verknüpfungen
      await prisma.companyGuarantee.deleteMany({
        where: { companyId: params.id }
      });

      // Erstelle neue Verknüpfungen
      if (guaranteeIds.length > 0) {
        await prisma.companyGuarantee.createMany({
          data: guaranteeIds.map((gId: string) => ({
            companyId: params.id,
            guaranteeId: gId
          }))
        });
      }
    }

    console.log('PATCH companies updateData:', updateData);

    const company = await prisma.company.update({
      where: { 
        id: params.id,
        tenantId: params.tenantId // Sicherheit: Nur Firmen des Tenants
      },
      data: updateData,
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

    console.log(`✅ Firma aktualisiert: ${company.name}`);

    return NextResponse.json({ company: transformed });
  } catch (error: any) {
    console.error('PATCH companies error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/companies/[id]
 * Firma löschen
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string; id: string }> }
) {
  try {
    const admin = await verifyAdminAuth(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const params = await context.params;

    const company = await prisma.company.delete({
      where: { 
        id: params.id,
        tenantId: params.tenantId
      }
    });

    console.log(`⚠️ Firma gelöscht: ${company.name}`);

    return NextResponse.json({ 
      success: true,
      message: 'Firma wurde gelöscht',
      company 
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Firma nicht gefunden' },
        { status: 404 }
      );
    }
    console.error('Fehler beim Löschen der Firma:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

