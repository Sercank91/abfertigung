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
 * GET /api/admin/tenant-data/[tenantId]/users
 * Liste aller User eines Tenants
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

    const users = await prisma.user.findMany({
      where: { tenantId: params.tenantId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fehler beim Laden der User:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tenant-data/[tenantId]/users
 * Neuen User für Tenant erstellen
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
    const { username, email, password, firstName, lastName, phone, role } = body;

    // Validierung
    if (!username || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

    // Validiere Rolle
    const validRoles = ['admin', 'schichtleiter', 'mitarbeiter'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Ungültige Rolle' },
        { status: 400 }
      );
    }

    // Prüfe ob Username bereits existiert (pro Tenant)
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: params.tenantId,
        username: username
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Benutzername existiert bereits für diesen Tenant' },
        { status: 409 }
      );
    }

    // Hash Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Erstelle User
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role,
        tenantId: params.tenantId,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`✅ User erstellt: ${user.username} (${user.role}) für Tenant ${params.tenantId}`);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Fehler beim Erstellen des Users:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

