import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { queryTenant } from '@/lib/db';
import AuthorizationList from './AuthorizationList';
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
async function getAuthorizations(tenantId: string) {
  try {
    const result = await queryTenant(
      tenantId,
      `SELECT 
        a.id,
        a.name,
        a.code,
        a.description,
        a."isActive",
        a."createdAt",
        a."updatedAt",
        COUNT(c.id) as clearance_count
       FROM "Authorization" a
       LEFT JOIN "Clearance" c ON a.id = c."authorizationId" AND c."tenantId" = $1
       WHERE a."tenantId" = $1 
       GROUP BY a.id
       ORDER BY a.name`,
      [tenantId]
    );
    
    // Format für Frontend
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        clearances: parseInt(row.clearance_count)
      }
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Bewilligungen:', error);
    return [];
  }
}

export default async function AuthorizationsPage() {
  const user = await getUser();
  const authorizations = user.tenantId ? await getAuthorizations(user.tenantId) : [];
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <div className="flex flex-col h-full">
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Bewilligungs-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <AuthorizationList 
              initialAuthorizations={authorizations}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
