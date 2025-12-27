import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token');
  
  if (!token) {
    redirect('/admin/login');
  }
  
  try {
    const { payload } = await jwtVerify(token.value, getJwtSecret());
    return payload as any;
  } catch (error) {
    redirect('/admin/login');
  }
}

async function getDashboardStats() {
  const [tenantCount, userCount, activeTenantsCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.tenant.count({ where: { status: 'active' } })
  ]);

  return {
    tenantCount,
    userCount,
    activeTenantsCount,
    inactiveTenantsCount: tenantCount - activeTenantsCount
  };
}

export default async function AdminDashboard() {
  const user = await getAdminUser();
  const stats = await getDashboardStats();

  return (
    <>
      {/* Header - Dunkelgrau mit rotem Admin-Badge */}
      <header 
        style={{ 
          backgroundColor: '#393939',
          height: '55px',
          minHeight: '56px',
          maxHeight: '56px'
        }} 
        className="w-full px-8 shadow-md flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded">
            SUPER ADMIN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">
            {user.firstName} {user.lastName}
          </span>
          <form action="/api/admin/logout" method="POST">
            <button 
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              Abmelden
            </button>
          </form>
        </div>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Dashboard
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            Übersicht aller Tenants und Systemstatistiken
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Willkommen, {user.firstName}!
            </h3>
            <p className="text-gray-600">
              Super-Admin Dashboard für abfertigung.io - Vollzugriff auf alle Tenants und Verwaltungsbereiche
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Tenants */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Gesamt Tenants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.tenantCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Tenants */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Aktive Tenants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeTenantsCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Users */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Gesamt User</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.userCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inactive Tenants */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Inaktive Tenants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inactiveTenantsCount}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tenant Management */}
            <Link href="/admin/tenants">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Tenant-Verwaltung</h4>
                    <p className="text-sm text-gray-600">Tenants verwalten</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Erstellen, bearbeiten und verwalten Sie alle Tenants (Speditionen) im System.
                </p>
              </div>
            </Link>

            {/* Live Statistics */}
            <Link href="/admin/live">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-green-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Live-Statistiken</h4>
                    <p className="text-sm text-gray-600">Echtzeit-Übersicht</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Sehen Sie in Echtzeit, welche User online sind und welche Seiten sie nutzen.
                </p>
              </div>
            </Link>

            {/* Tenant Data Management */}
            <Link href="/admin/tenant-data">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-purple-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Tenant-Daten</h4>
                    <p className="text-sm text-gray-600">Kunden & Firmen</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Verwalten Sie Kunden, Firmen, Bewilligungen und andere Daten pro Tenant.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        style={{ 
          backgroundColor: '#f2f2f2',
          borderTop: '1px solid #c6c6c6'
        }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project - Super Admin Portal
        </p>
      </footer>
    </>
  );
}

