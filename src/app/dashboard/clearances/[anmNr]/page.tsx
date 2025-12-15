import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { pool } from '@/lib/db';
import ClearanceForm from '../ClearanceForm';
import { getBaseUrl } from '@/lib/utils/get-base-url';

// ✅ Helper für AnmNr Formatierung
function formatAnmNr(anmNr: string): string {
  if (!anmNr || anmNr.length !== 5) return anmNr;
  return `${anmNr.slice(0, 2)}.${anmNr.slice(2)}`;
}

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

async function getInitialData() {
  try {
    const baseUrl = getBaseUrl();
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const [companiesRes, routesRes, goodsLocationsRes, authorizationsRes] = await Promise.all([
      fetch(`${baseUrl}/api/companies`, {
        headers: { 'Cookie': `auth-token=${token?.value}` },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/routes`, {
        headers: { 'Cookie': `auth-token=${token?.value}` },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/goods-locations`, {
        headers: { 'Cookie': `auth-token=${token?.value}` },
        cache: 'no-store',
      }),
      fetch(`${baseUrl}/api/authorizations`, {
        headers: { 'Cookie': `auth-token=${token?.value}` },
        cache: 'no-store',
      }),
    ]);
    
    const [companiesData, routesData, goodsLocationsData, authorizationsData] = await Promise.all([
      companiesRes.json(),
      routesRes.json(),
      goodsLocationsRes.json(),
      authorizationsRes.json(),
    ]);
    
    return {
      companies: companiesData.companies || [],
      routes: routesData.routes || [],
      goodsLocations: goodsLocationsData.goodsLocations || [],
      authorizations: authorizationsData.authorizations || [],
    };
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    return {
      companies: [],
      routes: [],
      goodsLocations: [],
      authorizations: [],
    };
  }
}

// ✅ NEU: Prüfe ob AnmNr existiert via API
async function checkClearanceExists(anmNr: string, tenantId: string) {
  try {
    const baseUrl = getBaseUrl();
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const response = await fetch(`${baseUrl}/api/clearances/${anmNr}`, {
      headers: { 'Cookie': `auth-token=${token?.value}` },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return false;
    }
    
    const clearance = await response.json();
    
    // Prüfe ob Clearance zum Tenant gehört
    if (clearance.tenantId !== tenantId) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Fehler beim Prüfen der Abfertigung:', error);
    return false;
  }
}

export default async function EditClearancePage({
  params,
}: {
  params: { anmNr: string };  // ✅ NEU: anmNr statt lrn!
}) {
  const user = await getUser();

  const anmNr = decodeURIComponent(params.anmNr);

  // ✅ Wenn Parameter nur Zahlen sind, könnte es anmNr ODER ID sein
  if (/^\d+$/.test(anmNr)) {
    // Versuche ZUERST als anmNr (häufigster Fall)
    const existsAsAnmNr = await checkClearanceExists(anmNr, user.tenantId);

    if (!existsAsAnmNr) {
      // Nicht als anmNr gefunden - versuche als ID
      try {
        const result = await pool.query(
          'SELECT "anmNr" FROM "Clearance" WHERE id = $1 AND "tenantId" = $2',
          [parseInt(anmNr), user.tenantId]
        );

        if (result.rows.length > 0) {
          // Als ID gefunden - redirecte zur anmNr
          const actualAnmNr = result.rows[0].anmNr;
          redirect(`/dashboard/clearances/${actualAnmNr}`);
        } else {
          // Weder anmNr noch ID gefunden
          redirect('/dashboard/clearances');
        }
      } catch (error) {
        // Next.js redirect wirft einen speziellen Error - diesen durchlassen
        if (error && typeof error === 'object' && 'digest' in error &&
            typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')) {
          throw error;
        }
        console.error('Fehler beim Laden der Clearance:', error);
        redirect('/dashboard/clearances');
      }
    }
    // Wenn existsAsAnmNr true ist, machen wir einfach weiter unten
  } else {
    // Kein reiner Zahlenstring - prüfe als anmNr
    const exists = await checkClearanceExists(anmNr, user.tenantId);
    if (!exists) {
      redirect('/dashboard/clearances');
    }
  }
  
  const data = await getInitialData();

  return (
    <>
      {/* Subheader mit Titel und AnmNr */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Abfertigung bearbeiten - {user.tenantName}
          </h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">Anmelde-Nr.</div>
            <div className="text-2xl font-bold text-blue-700">{formatAnmNr(anmNr)}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="w-full">
          <ClearanceForm
            anmNr={anmNr}  
            userId={user.id}
          />
        </div>
      </div>
    </>
  );
}