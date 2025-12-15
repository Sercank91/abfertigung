import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import ClearanceForm from '../ClearanceForm';

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

// ClearanceForm lädt seine Daten selbst via Client-Side fetch
// Das funktioniert, weil relative URLs auf dem Client korrekt aufgelöst werden

export default async function NewClearancePage() {
  const user = await getUser();
  
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
          />
        </div>
      </div>
    </>
  );
}
