import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { pool } from '@/lib/db';
import CompanyList from './CompanyList';
import SubHeader from '@/components/SubHeader';

async function getUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  if (!token) redirect('/');
  
  try {
    const payload = decodeJwt(token.value);
    return payload as any;
  } catch (error) {
    redirect('/');
  }
}

// Direkte Datenbankabfrage statt HTTP-Request
async function getCompanies(tenantId: string) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.country, c.address, c."postalCode", c.city, 
              c.emails, c.phones, c."isActive", c."createdAt", c."updatedAt",
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', g.id,
                    'name', g.name
                  )
                ) FILTER (WHERE g.id IS NOT NULL),
                '[]'
              ) as guarantees
       FROM "Company" c
       LEFT JOIN "CompanyGuarantee" cg ON c.id = cg."companyId"
       LEFT JOIN "Guarantee" g ON cg."guaranteeId" = g.id
       WHERE c."tenantId" = $1 
       GROUP BY c.id
       ORDER BY c.name`,
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Fehler beim Laden der Firmen:', error);
    return [];
  }
}

// Direkte Datenbankabfrage für Bürgschaften
async function getGuarantees(tenantId: string) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, "isActive"
       FROM "Guarantee" 
       WHERE "tenantId" = $1 AND "isActive" = true
       ORDER BY name`,
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Fehler beim Laden der Bürgschaften:', error);
    return [];
  }
}

export default async function CompaniesPage() {
  const user = await getUser();
  const companies = user.tenantId ? await getCompanies(user.tenantId) : [];
  const guarantees = user.tenantId ? await getGuarantees(user.tenantId) : [];
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Firmen-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <CompanyList 
            initialCompanies={companies} 
            availableGuarantees={guarantees}
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  );
}
