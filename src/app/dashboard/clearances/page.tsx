import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import ClearanceList from './ClearanceList';
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

async function getClearances() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const response = await fetch(`${baseUrl}/api/clearances`, {
      headers: {
        'Cookie': `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.clearances || [];
  } catch (error) {
    console.error('Fehler beim Laden der Abfertigungen:', error);
    return [];
  }
}

export default async function ClearancesPage() {
  const user = await getUser();
  const clearances = await getClearances();
  
  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`NCTS Abgang - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="w-full">
        <ClearanceList />
        </div>
      </div>
    </>
  );
}