import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { queryTenant } from '@/lib/db';
import GuaranteeList from './GuaranteeList';
import SubHeader from '@/components/SubHeader';

async function getUser() {
  const cookieStore = await cookies();
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
async function getGuarantees(tenantId: string) {
  try {
    // ✅ FIX: Lade auch die Anzahl der Firmen aus CompanyGuarantee
    const result = await queryTenant(
      tenantId,
      `SELECT 
        g.id,
        g.name,
        g.description,
        g."isActive",
        g."createdAt",
        g."updatedAt",
        COUNT(cg."companyId") as company_count
      FROM "Guarantee" g
      LEFT JOIN "CompanyGuarantee" cg ON g.id = cg."guaranteeId"
      WHERE g."tenantId" = $1
      GROUP BY g.id
      ORDER BY g.name ASC`,
      [tenantId]
    );
    
    // Format für Frontend mit _count
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        companies: parseInt(row.company_count)
      }
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Bürgschaften:', error);
    return [];
  }
}

export default async function GuaranteesPage() {
  const user = await getUser();
  const guarantees = user.tenantId ? await getGuarantees(user.tenantId) : [];
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <div className="flex flex-col h-full">
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Bürgschaft-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <GuaranteeList 
              initialGuarantees={guarantees} 
              canEdit={canEdit}
              userRole={user.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
