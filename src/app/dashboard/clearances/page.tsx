import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import ClearanceList from './ClearanceList';
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

// ClearanceList lädt seine Daten selbst via Client-Side fetch
// Das funktioniert, weil relative URLs auf dem Client korrekt aufgelöst werden

export default async function ClearancesPage() {
  const user = await getUser();
  
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
