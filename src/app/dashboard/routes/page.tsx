import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { queryTenant, querySystem } from '@/lib/db';
import RouteList from './RouteList';
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
async function getRoutes(tenantId: string) {
  try {
    const result = await queryTenant(
      tenantId,
      `SELECT r.id, r.name, r.countries, r.description, r."isActive", r."createdAt", r."updatedAt",
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', rto.id,
                    'order', rto."order",
                    'customsOffice', json_build_object(
                      'id', co.id,
                      'code', co.code,
                      'name', co.name,
                      'countryCode', co."countryCode"
                    )
                  ) ORDER BY rto."order"
                ) FILTER (WHERE rto.id IS NOT NULL),
                '[]'
              ) as "transitOffices"
       FROM "Route" r
       LEFT JOIN "RouteTransitOffice" rto ON r.id = rto."routeId"
       LEFT JOIN "CustomsOffice" co ON rto."customsOfficeId" = co.id
       WHERE r."tenantId" = $1 
       GROUP BY r.id
       ORDER BY r.name`,
      [tenantId]
    );
    return result.rows;
  } catch (error) {
    console.error('Fehler beim Laden der Routen:', error);
    return [];
  }
}

// Direkte Datenbankabfrage für Zollämter (System-Query - keine tenantId)
async function getCustomsOffices() {
  try {
    const result = await querySystem(
      `SELECT id, code, name, "countryCode", city
       FROM "CustomsOffice" 
       WHERE "isActive" = true
       ORDER BY name
       LIMIT 200`
    );
    return result.rows;
  } catch (error) {
    console.error('Fehler beim Laden der Zollämter:', error);
    return [];
  }
}

export default async function RoutesPage() {
  const user = await getUser();
  const routes = user.tenantId ? await getRoutes(user.tenantId) : [];
  const customsOffices = await getCustomsOffices();
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <div className="flex flex-col h-full">
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Routen-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <RouteList 
              initialRoutes={routes}
              initialCustomsOffices={customsOffices}
              canEdit={canEdit}
              userRole={user.role}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
