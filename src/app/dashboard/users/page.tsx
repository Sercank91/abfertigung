import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import { cache } from 'react';
import { pool } from '@/lib/db';
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
  const cookieStore = cookies();
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
    const result = await pool.query(
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
      WHERE "tenantId" = $1 
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
    <>
      {/* Subheader */}
      <SubHeader 
        title={`Benutzer-Verwaltung - ${tenantName}`}
        userRole={userRole}
        tenantName={tenantName}
      />

      {/* Main Content */}
      <main className="px-8 py-6" role="main">
        <div className="max-w-7xl mx-auto">
          <UserList 
            initialUsers={users}
            canEdit={canEdit}
            userRole={userRole}
          />
        </div>
      </main>
    </>
  );
}

// Error boundary fallback
export function generateStaticParams() {
  return [];
}
