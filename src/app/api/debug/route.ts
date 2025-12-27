import { NextRequest, NextResponse } from 'next/server';
import { querySystem, queryTenant } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

const getSecret = () => getJwtSecret();

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload as any;
  } catch (error) {
    return null;
  }
}

// GET - Debug-Informationen abrufen (nur für admins)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Nur für Admins' }, { status: 403 });
    }

    // Teste Datenbankverbindung
    let dbStatus = 'unknown';
    let dbError = null;
    let tenantCount = 0;
    let userCount = 0;
    let currentTenant = null;

    try {
      // Test-Query (System)
      const testResult = await querySystem('SELECT 1 as test');
      dbStatus = testResult.rows[0]?.test === 1 ? 'connected' : 'error';
      
      // Zähle Tenants (System)
      const tenantsResult = await querySystem('SELECT COUNT(*) as count FROM "Tenant"');
      tenantCount = parseInt(tenantsResult.rows[0]?.count || '0');
      
      // Zähle User für diesen Tenant
      const usersResult = await queryTenant(
        user.tenantId,
        'SELECT COUNT(*) as count FROM "User" WHERE "tenantId" = $1',
        [user.tenantId]
      );
      userCount = parseInt(usersResult.rows[0]?.count || '0');
      
      // Hole aktuellen Tenant (System)
      const tenantResult = await querySystem(
        'SELECT id, name, domain FROM "Tenant" WHERE id = $1',
        [user.tenantId]
      );
      currentTenant = tenantResult.rows[0] || null;
      
    } catch (error: any) {
      dbStatus = 'error';
      dbError = error.message;
    }

    // Headers für Debug
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.startsWith('x-') || key === 'host' || key === 'cookie') {
        headers[key] = key === 'cookie' ? '[REDACTED]' : value;
      }
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
      },
      database: {
        status: dbStatus,
        error: dbError,
        tenantCount,
        userCount,
        currentTenant,
      },
      user: {
        id: user.userId || user.id,
        username: user.username,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        role: user.role,
      },
      headers,
    });

  } catch (error: any) {
    console.error('❌ Debug-Fehler:', error);
    return NextResponse.json({ 
      error: 'Debug-Fehler', 
      message: error.message 
    }, { status: 500 });
  }
}

