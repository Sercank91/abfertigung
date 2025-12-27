import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
 * GET /api/admin/tenants/[id]
 * Einzelnen Tenant abrufen
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            companies: true,
            clearances: true,
            guarantees: true,
            routes: true,
            goodsLocations: true,
            authorizations: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Fehler beim Laden des Tenants:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tenants/[id]
 * Tenant aktualisieren (Name, Status, Logo)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    // Check if request is FormData (with logo) or JSON (without logo)
    const contentType = request.headers.get('content-type') || '';
    let name: string | undefined;
    let status: string | undefined;
    let logoFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // FormData with potential logo upload
      const formData = await request.formData();
      name = formData.get('name') as string | undefined;
      status = formData.get('status') as string | undefined;
      logoFile = formData.get('logo') as File | null;
    } else {
      // JSON without logo
      const body = await request.json();
      name = body.name;
      status = body.status;
    }

    // Validiere Status
    if (status && !['active', 'inactive', 'deleted'].includes(status)) {
      return NextResponse.json(
        { error: 'Ungültiger Status' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;

    // Handle logo upload
    if (logoFile && logoFile.size > 0) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif', 'image/webp'];
      console.log('🔍 Logo-Upload Validierung:', { fileName: logoFile.name, fileType: logoFile.type, allowedTypes });
      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          { error: 'Ungültiger Dateityp. Erlaubt: PNG, JPG, SVG, GIF, WebP' },
          { status: 400 }
        );
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (logoFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Datei zu groß. Maximum: 2 MB' },
          { status: 400 }
        );
      }

      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'tenant-logos');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Get tenant to check for old logo
      const existingTenant = await prisma.tenant.findUnique({
        where: { id: params.id },
        select: { logoUrl: true }
      });

      // Delete old logo file if it exists and is a local file
      if (existingTenant?.logoUrl && existingTenant.logoUrl.startsWith('/tenant-logos/')) {
        const oldLogoPath = path.join(process.cwd(), 'public', existingTenant.logoUrl);
        if (existsSync(oldLogoPath)) {
          try {
            await unlink(oldLogoPath);
          } catch (err) {
            console.error('Fehler beim Löschen des alten Logos:', err);
          }
        }
      }

      // Generate unique filename
      const fileExtension = path.extname(logoFile.name);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Save file
      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Set logo URL (relative to public directory)
      updateData.logoUrl = `/tenant-logos/${uniqueFileName}`;
      
      console.log(`✅ Logo hochgeladen: ${updateData.logoUrl}`);
    }

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: updateData
    });

    console.log(`✅ Tenant aktualisiert: ${tenant.name} (${tenant.domain}) - Status: ${tenant.status}`);

    return NextResponse.json({ tenant });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Tenant nicht gefunden' },
        { status: 404 }
      );
    }
    console.error('Fehler beim Aktualisieren des Tenants:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tenants/[id]
 * Tenant löschen (Soft-Delete: Status auf 'deleted')
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    // Soft-Delete: Status auf 'deleted' setzen
    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: { status: 'deleted' }
    });

    console.log(`⚠️ Tenant gelöscht (soft): ${tenant.name} (${tenant.domain})`);

    return NextResponse.json({ 
      success: true,
      message: 'Tenant wurde deaktiviert (Soft-Delete)',
      tenant 
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Tenant nicht gefunden' },
        { status: 404 }
      );
    }
    console.error('Fehler beim Löschen des Tenants:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    );
  }
}

