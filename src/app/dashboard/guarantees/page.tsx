import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { pool } from '@/lib/db';
import GuaranteeList from './GuaranteeList';
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
async function getGuarantees(tenantId: string) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, "isActive", "createdAt", "updatedAt"
       FROM "Guarantee" 
       WHERE "tenantId" = $1 
       ORDER BY name`,
      [tenantId]
    );
    return result.rows;
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
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Bürgschaft-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <GuaranteeList 
            initialGuarantees={guarantees} 
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  );
}
