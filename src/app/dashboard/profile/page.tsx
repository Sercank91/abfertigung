import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { querySystem } from '@/lib/db';
import ProfileForm from './ProfileForm';
import SubHeader from '@/components/SubHeader';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  if (!token) redirect('/');
  
  try {
    const payload = decodeJwt(token.value);
    
    // Hole die aktuellen Daten aus der Datenbank (nicht nur aus JWT)
    const result = await querySystem(
      `SELECT id, username, email, "firstName", "lastName", phone, role, "tenantId"
       FROM "User" 
       WHERE id = $1`,
      [payload.id]
    );
    
    if (result.rows.length === 0) {
      redirect('/');
    }
    
    const user = result.rows[0];
    
    // Tenant-Name aus JWT
    return {
      ...user,
      tenantName: payload.tenantName
    };
  } catch (error) {
    redirect('/');
  }
}

export default async function ProfilePage() {
  const user = await getUser();
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Subheader mit Titel */}
      <SubHeader 
        title="Profil"
        userRole={user.role}
        tenantName={user.tenantName}
      />

      {/* Main Content */}
      <main className="flex-1 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <ProfileForm user={user} />
        </div>
      </main>
    </div>
  );
}