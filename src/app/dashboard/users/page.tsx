import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { cache } from 'react';
import { queryTenant } from '@/lib/db';
import UserList from './UserList';
import SubHeader from '@/components/SubHeader';

// Types
interface JWTPayload {
  userId?: string;
  tenantId?: string;
  tenantName?: string;
  username?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

interface User {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Cache for multiple calls in same request
const getUser = cache(async (): Promise<JWTPayload> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  if (!token?.value) {
    console.log('No auth token found, redirecting to login');
    redirect('/');
  }
  
  try {
    const payload = decodeJwt(token.value);
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    redirect('/');
  }
});

// Direkte Datenbankabfrage statt HTTP-Request
async function getUsers(tenantId: string): Promise<User[]> {
  try {
    const result = await queryTenant(
      tenantId,
      `SELECT 
        id,
        username,
        email,
        "firstName",
        "lastName",
        phone,
        role,
        "isActive",
        "createdAt",
        "updatedAt"
      FROM "User" 
      WHERE "tenantId" = $1 AND "isActive" = true
      ORDER BY "lastName", "firstName"`,
      [tenantId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching users from database:', error);
    return [];
  }
}

// Role check helper
function hasEditPermission(role: string | undefined): boolean {
  return role === 'admin' || role === 'schichtleiter';
}

// Metadata for the page
export const metadata = {
  title: 'Benutzer-Verwaltung',
  description: 'Verwalten Sie Benutzer in Ihrem System',
};

export default async function UsersPage() {
  // Get current user
  const user = await getUser();
  
  // Check permissions
  const canEdit = hasEditPermission(user.role);
  
  // Only fetch users if user has permission to view them
  if (!canEdit && user.role !== 'mitarbeiter') {
    redirect('/dashboard');
  }
  
  // Fetch users list directly from database
  const users = user.tenantId ? await getUsers(user.tenantId) : [];
  
  // Provide defaults for missing values
  const tenantName = user.tenantName || 'System';
  const userRole = user.role || 'user';
  
  return (
    <div className="flex flex-col h-full">
      {/* Subheader */}
      <SubHeader 
        title={`Benutzer-Verwaltung - ${tenantName}`}
        userRole={userRole}
        tenantName={tenantName}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto" role="main">
        <div className="px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <UserList 
              initialUsers={users}
              canEdit={canEdit}
              userRole={userRole}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Error boundary fallback
export function generateStaticParams() {
  return [];
}
