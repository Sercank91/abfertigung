import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

async function getUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token');
  if (!token) redirect('/');
  
  try {
    const { payload } = await jwtVerify(token.value, SECRET);
    return payload as any;
  } catch (error) {
    redirect('/');
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  // Vorname extrahieren (erster Teil vor dem Leerzeichen)
  const firstName = user.firstName || 'User';
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Header - Zentral für alle Dashboard-Seiten */}
      <Header firstName={firstName} tenantName={user.tenantName} />

      {/* Main Content - Hier werden die Seiten eingefügt */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Zentral für alle Dashboard-Seiten */}
      <Footer />
    </div>
  );
}