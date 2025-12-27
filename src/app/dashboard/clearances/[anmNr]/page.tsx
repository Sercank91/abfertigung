import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { queryTenant } from '@/lib/db';
import ClearanceForm from '../ClearanceForm';

// ✅ Helper für AnmNr Formatierung
function formatAnmNr(anmNr: string): string {
  if (!anmNr || anmNr.length !== 5) return anmNr;
  return `${anmNr.slice(0, 2)}.${anmNr.slice(2)}`;
}

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

// ✅ Direkte Datenbankabfrage: Prüfe ob AnmNr existiert
async function checkClearanceExists(anmNr: string, tenantId: string) {
  try {
    const result = await queryTenant(
      tenantId,
      'SELECT id FROM "Clearance" WHERE "anmNr" = $1 AND "tenantId" = $2',
      [anmNr, tenantId]
    );
    return result.rows.length > 0;
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
        const result = await queryTenant(
          user.tenantId,
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

  return (
    <div className="flex flex-col h-full">
      {/* Subheader mit Titel und AnmNr */}
      <div className="w-full pb-1 bg-[#f2f2f2]">
        <div className="px-1 flex flex-row flex-nowrap justify-between">
          <h2 className="text-gray-800 text-[1.8rem] font-normal leading-none">
            Abfertigung bearbeiten - {user.tenantName}
          </h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">Anmelde-Nr.</div>
            <div className="text-2xl font-bold text-blue-700">{formatAnmNr(anmNr)}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <div className="w-full">
            <ClearanceForm
              anmNr={anmNr}  
              userId={user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
