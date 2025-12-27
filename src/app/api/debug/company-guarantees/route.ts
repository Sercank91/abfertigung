import { NextRequest, NextResponse } from 'next/server';
import { queryTenant } from '@/lib/db';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

const getSecret = () => getJwtSecret();

async function getUserFromToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { id: string; tenantId: string; email: string; role: string };
  } catch (error) {
    return null;
  }
}

/**
 * DEBUG-Endpoint: Zeigt den Status der CompanyGuarantee-Verknüpfungen
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Nur für Admins
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    console.log('🔍 DEBUG: Prüfe CompanyGuarantee-Verknüpfungen für Tenant:', user.tenantId);

    // 1. Alle Firmen des Tenants
    const companiesResult = await queryTenant(
      user.tenantId,
      `SELECT id, name FROM "Company" WHERE "tenantId" = $1 ORDER BY name`,
      [user.tenantId]
    );

    // 2. Alle Bürgschaften des Tenants
    const guaranteesResult = await queryTenant(
      user.tenantId,
      `SELECT id, name FROM "Guarantee" WHERE "tenantId" = $1 ORDER BY name`,
      [user.tenantId]
    );

    // 3. Alle CompanyGuarantee-Verknüpfungen
    const linksResult = await queryTenant(
      user.tenantId,
      `SELECT 
        cg.id,
        cg."companyId",
        cg."guaranteeId",
        c.name as company_name,
        g.name as guarantee_name
      FROM "CompanyGuarantee" cg
      INNER JOIN "Company" c ON cg."companyId" = c.id
      INNER JOIN "Guarantee" g ON cg."guaranteeId" = g.id
      WHERE c."tenantId" = $1
      ORDER BY c.name, g.name`,
      [user.tenantId]
    );

    // 4. Zähle Firmen pro Bürgschaft
    const countResult = await queryTenant(
      user.tenantId,
      `SELECT 
        g.id,
        g.name,
        COUNT(cg."companyId") as company_count
      FROM "Guarantee" g
      LEFT JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
      WHERE g."tenantId" = $1
      GROUP BY g.id
      ORDER BY g.name`,
      [user.tenantId]
    );

    const report = {
      tenant: user.tenantId,
      summary: {
        totalCompanies: companiesResult.rows.length,
        totalGuarantees: guaranteesResult.rows.length,
        totalLinks: linksResult.rows.length,
      },
      companies: companiesResult.rows,
      guarantees: guaranteesResult.rows,
      links: linksResult.rows,
      guaranteeStats: countResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        companyCount: parseInt(row.company_count)
      })),
      diagnosis: {
        hasCompanies: companiesResult.rows.length > 0,
        hasGuarantees: guaranteesResult.rows.length > 0,
        hasLinks: linksResult.rows.length > 0,
        issue: companiesResult.rows.length > 0 && guaranteesResult.rows.length > 0 && linksResult.rows.length === 0
          ? '⚠️ PROBLEM: Es gibt Firmen und Bürgschaften, aber keine Verknüpfungen in CompanyGuarantee!'
          : linksResult.rows.length === 0
          ? 'ℹ️ Keine Verknüpfungen vorhanden (möglicherweise noch keine Firmen erstellt)'
          : '✅ Verknüpfungen vorhanden'
      }
    };

    console.log('📊 DEBUG-Report:', JSON.stringify(report, null, 2));

    return NextResponse.json(report);

  } catch (error) {
    console.error('❌ Fehler beim Debug:', error);
    return NextResponse.json(
      { error: 'Fehler beim Debug', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

