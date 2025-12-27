import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwt } from 'jose';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeartbeatClient from '@/components/HeartbeatClient';
import { prisma } from '@/lib/prisma';
import { getSubdomainFromHost } from '@/lib/tenant';

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

async function checkTenantStatus() {
  const headersList = await headers();
  const hostHeader = headersList.get('host');
  const subdomain = getSubdomainFromHost(hostHeader);
  
  if (subdomain) {
    const tenant = await prisma.tenant.findUnique({
      where: { domain: subdomain },
      select: { status: true }
    });
    
    if (!tenant || tenant.status === 'deleted' || tenant.status === 'inactive') {
      redirect('/');
    }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prüfe Tenant-Status
  await checkTenantStatus();
  
  const user = await getUser();
  // Vorname extrahieren (erster Teil vor dem Leerzeichen)
  const firstName = user.firstName || 'User';
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Heartbeat Client für Presence Tracking */}
      <HeartbeatClient />
      
      {/* Header - Fix oben, Höhe 56px */}
      <Header firstName={firstName} tenantName={user.tenantName} />

      {/* Outer Container - TELTEC: tt-main-container-out */}
      <div className="bg-[#e1e1e1] p-2 h-[calc(100vh-56px)] flex">
        {/* Inner Container - TELTEC: tt-main-container */}
        <div className="bg-white border border-[#c6c6c6] shadow-[0_0_7px_-2px_#c6c6c6] overflow-auto h-full w-full flex flex-col">
          {/* Seiteninhalt - entspricht router-outlet */}
          {children}
          
          {/* Footer - Innerhalb des Inner Containers, wie bei TELTEC */}
          <Footer />
        </div>
      </div>
    </div>
  );
}