import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import RouteList from './RouteList';
import SubHeader from '@/components/SubHeader';

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  if (!token) redirect('/');
  
  try {
    const { payload } = await jwtVerify(token.value, getSecret());
    return payload as any;
  } catch (error) {
    redirect('/');
  }
}

async function getRoutes() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const response = await fetch(`${baseUrl}/api/routes`, {
      headers: {
        'Cookie': `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.routes || [];
  } catch (error) {
    console.error('Fehler beim Laden der Routen:', error);
    return [];
  }
}

async function getCustomsOffices() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const response = await fetch(`${baseUrl}/api/customs-offices?limit=200`, {
      headers: {
        'Cookie': `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.offices || [];
  } catch (error) {
    console.error('Fehler beim Laden der Zollämter:', error);
    return [];
  }
}

export default async function RoutesPage() {
  const user = await getUser();
  const routes = await getRoutes();
  const customsOffices = await getCustomsOffices();
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Routen-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
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
    </>
  );
}