import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import AuthorizationList from './AuthorizationList';
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

async function getAuthorizations() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token');
    
    const response = await fetch(`${baseUrl}/api/authorizations`, {
      headers: {
        'Cookie': `auth-token=${token?.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.authorizations || [];
  } catch (error) {
    console.error('Fehler beim Laden der Bewilligungen:', error);
    return [];
  }
}

export default async function AuthorizationsPage() {
  const user = await getUser();
  const authorizations = await getAuthorizations();
  
  const canEdit = user.role === 'admin' || user.role === 'schichtleiter';
  
  return (
    <>
      {/* Subheader mit Titel */}
      <SubHeader 
        title={`Bewilligungs-Verwaltung - ${user.tenantName}`}
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <AuthorizationList 
            initialAuthorizations={authorizations}
            canEdit={canEdit}
          />
        </div>
      </div>
    </>
  );
}