import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import ClearanceForm from '../ClearanceForm';

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

// ClearanceForm lädt seine Daten selbst via Client-Side fetch
// Das funktioniert, weil relative URLs auf dem Client korrekt aufgelöst werden

export default async function NewClearancePage() {
  const user = await getUser();
  
  return (
    <div className="flex flex-col h-full">
      {/* Subheader mit Titel */}
      <div className="w-full pb-1 bg-[#f2f2f2]">
        <div className="px-1 flex flex-row flex-nowrap justify-between">
          <h2 className="text-gray-800 text-[1.8rem] font-normal leading-none">
            Neue Abfertigung - {user.tenantName}
          </h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="w-full">
            <ClearanceForm
              userId={user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
