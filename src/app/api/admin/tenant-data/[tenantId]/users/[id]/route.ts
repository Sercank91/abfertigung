import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

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
 * PATCH /api/admin/tenant-data/[tenantId]/users/[id]
 * User aktualisieren
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
    const { email, firstName, lastName, phone, role, isActive, password } = body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email || null;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) {
      // Validiere Rolle
      const validRoles = ['admin', 'schichtleiter', 'mitarbeiter'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Ungültige Rolle' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Passwort ändern (optional)
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { 
        id: params.id,
        tenantId: params.tenantId // Sicherheit: Nur User des Tenants
      },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    console.log(`✅ User aktualisiert: ${user.username}`);

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      );
    }
    console.error('Fehler beim Aktualisieren des Users:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenant-data/[tenantId]/users/[id]
 * User löschen (Hard-Delete)
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

    // Hard-Delete: User komplett löschen
    const user = await prisma.user.delete({
      where: { 
        id: params.id,
        tenantId: params.tenantId
      }
    });

    console.log(`⚠️ User gelöscht: ${user.username}`);

    return NextResponse.json({ 
      success: true,
      message: 'User wurde gelöscht',
      user 
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User nicht gefunden' },
        { status: 404 }
      );
    }
    console.error('Fehler beim Löschen des Users:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

