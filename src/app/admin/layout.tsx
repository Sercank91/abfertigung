import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token');
  
  if (!token) {
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token.value, getJwtSecret());
    return payload as any;
  } catch (error) {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  
  // Wenn kein User, dann ist es die Login-Page (wird von Middleware gehandelt)
  // Hier rendern wir einfach die children
  if (!user) {
    return <>{children}</>;
  }

  // User ist eingeloggt - zeige Admin Layout
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {children}
    </div>
  );
}

