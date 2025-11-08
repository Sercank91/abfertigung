import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { cache } from 'react';
import UserList from './UserList';
import SubHeader from '@/components/SubHeader';

// Environment validation
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not configured');
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

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

interface ApiResponse {
  users?: User[];
  error?: string;
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
    const { payload } = await jwtVerify(token.value, SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    redirect('/');
  }
});

async function getUsers(token: string | undefined): Promise<User[]> {
  if (!token) {
    console.error('No token provided for fetching users');
    return [];
  }
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Validate URL
    const url = new URL('/api/users', baseUrl);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store', // Always fresh data for user management
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch users: HTTP ${response.status}`);
      return [];
    }

    const data: ApiResponse = await response.json();
    
    // Validate response structure
    if (!Array.isArray(data.users)) {
      console.error('Invalid response structure:', data);
      return [];
    }
    
    return data.users;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Request timeout while fetching users');
      } else {
        console.error('Error fetching users:', error.message);
      }
    } else {
      console.error('Unknown error fetching users:', error);
    }
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
  
  // Fetch users list
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  const users = await getUsers(token?.value);
  
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