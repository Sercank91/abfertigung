import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { pool } from '@/lib/db';
import GoodsLocationList from './GoodsLocationList';
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
async function getGoodsLocations(tenantId: string) {
  try {
    const result = await pool.query(
      `SELECT id, name, code, description, "isActive", "createdAt", "updatedAt"
       FROM "GoodsLocation" 
       WHERE "tenantId" = $1 
       ORDER BY name`,
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Fehler beim Laden der Warenorte:', error);
    return [];
  }
}

export default async function GoodsLocationsPage() {
  const user = await getUser();
  const goodsLocations = user.tenantId ? await getGoodsLocations(user.tenantId) : [];
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Warenort-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <GoodsLocationList 
            initialGoodsLocations={goodsLocations}
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  );
}
