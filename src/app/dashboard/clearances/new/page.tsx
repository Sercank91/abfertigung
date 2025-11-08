import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import ClearanceForm from '../ClearanceForm';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  if (!token) redirect('/');
  
  try {
    const { payload } = await jwtVerify(token.value, SECRET);
    return payload as any;
  } catch (error) {
    redirect('/');
  }
}

// Lade initiale Daten
async function getInitialData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    // Firmen laden
    const companiesRes = await fetch(`${baseUrl}/api/companies`, {
      headers: { 'Cookie': `auth-token=${token?.value}` },
      cache: 'no-store',
    });
    const companiesData = await companiesRes.json();
    
    // Routen laden
    const routesRes = await fetch(`${baseUrl}/api/routes`, {
      headers: { 'Cookie': `auth-token=${token?.value}` },
      cache: 'no-store',
    });
    const routesData = await routesRes.json();
    
    // Warenorte laden
    const goodsLocationsRes = await fetch(`${baseUrl}/api/goods-locations`, {
      headers: { 'Cookie': `auth-token=${token?.value}` },
      cache: 'no-store',
    });
    const goodsLocationsData = await goodsLocationsRes.json();
    
    // Bewilligungen laden
    const authorizationsRes = await fetch(`${baseUrl}/api/authorizations`, {
      headers: { 'Cookie': `auth-token=${token?.value}` },
      cache: 'no-store',
    });
    const authorizationsData = await authorizationsRes.json();
    
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

export default async function NewClearancePage() {
  const user = await getUser();
  const initialData = await getInitialData();
  
  return (
    <>
      {/* Subheader mit Titel */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <h2 className="text-gray-800 text-xl font-normal leading-none">
          Neue Abfertigung - {user.tenantName}
        </h2>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="w-full">
          <ClearanceForm
            userId={user.id}
            companies={initialData.companies}
            routes={initialData.routes}
            goodsLocations={initialData.goodsLocations}
            authorizations={initialData.authorizations}
          />
        </div>
      </div>
    </>
  );
}