'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: string;
  _count: {
    users: number;
    companies: number;
    clearances: number;
    guarantees: number;
    routes: number;
    goodsLocations: number;
    authorizations: number;
  };
}

export default function TenantDataPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const tenantRes = await fetch(`/api/admin/tenants/${tenantId}`);
      const tenantData = await tenantRes.json();
      setTenant(tenantData.tenant);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Tenant nicht gefunden</h2>
          <Link href="/admin/tenants">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">
              Zurück zur Übersicht
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header 
        style={{ backgroundColor: '#393939', height: '56px' }} 
        className="w-full px-8 shadow-md flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <h1 className="text-white text-3xl font-light tracking-wide cursor-pointer hover:text-gray-300">
              MAS Project
            </h1>
          </Link>
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded">
            SUPER ADMIN
          </span>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button 
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Abmelden
          </button>
        </form>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-end gap-3">
            <h2 className="text-gray-800 text-xl font-normal leading-none">
              {tenant.name}
            </h2>
            <span className="text-gray-600 text-sm leading-none mb-0.5 font-mono">
              {tenant.domain}
            </span>
          </div>
          <Link href="/admin/tenants">
            <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
              ← Zurück zu Tenants
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Grid - Klickbare Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* User */}
            <Link href={`/admin/tenant-data/${tenantId}/users`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Benutzer</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.users}</p>
                <p className="text-xs text-blue-600 mt-1">→ Verwalten</p>
              </div>
            </Link>

            {/* Companies */}
            <Link href={`/admin/tenant-data/${tenantId}/companies`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Firmen</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.companies}</p>
                <p className="text-xs text-purple-600 mt-1">→ Verwalten</p>
              </div>
            </Link>

            {/* Clearances */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-600 mb-1">Abfertigungen</p>
              <p className="text-2xl font-bold text-gray-900">{tenant._count.clearances}</p>
            </div>

            {/* Guarantees */}
            <Link href={`/admin/tenant-data/${tenantId}/guarantees`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Bürgschaften</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.guarantees}</p>
                <p className="text-xs text-yellow-600 mt-1">→ Verwalten</p>
              </div>
            </Link>

            {/* Routes */}
            <Link href={`/admin/tenant-data/${tenantId}/routes`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Routen</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.routes}</p>
                <p className="text-xs text-indigo-600 mt-1">→ Verwalten</p>
              </div>
            </Link>

            {/* Goods Locations */}
            <Link href={`/admin/tenant-data/${tenantId}/goods-locations`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Warenorte</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.goodsLocations}</p>
                <p className="text-xs text-orange-600 mt-1">→ Verwalten</p>
              </div>
            </Link>

            {/* Authorizations */}
            <Link href={`/admin/tenant-data/${tenantId}/authorizations`}>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500 cursor-pointer hover:shadow-lg transition-shadow">
                <p className="text-xs text-gray-600 mb-1">Bewilligungen</p>
                <p className="text-2xl font-bold text-gray-900">{tenant._count.authorizations}</p>
                <p className="text-xs text-pink-600 mt-1">→ Verwalten</p>
              </div>
            </Link>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Tenant-Daten Verwaltung</h3>
            <p className="text-sm text-blue-800 mb-4">
              Klicken Sie auf die Cards oben, um die jeweiligen Verwaltungsbereiche zu öffnen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Benutzer:</strong> Erstellen, bearbeiten und Rollen zuweisen</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Firmen:</strong> Kunden und Firmen verwalten</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Bürgschaften:</strong> Bürgschaften erstellen und verwalten</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Warenorte:</strong> Warenorte erstellen und verwalten</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Bewilligungen:</strong> Bewilligungen erstellen und verwalten</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Routen:</strong> Routen mit Zollstellen verwalten</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        style={{ backgroundColor: '#f2f2f2', borderTop: '1px solid #c6c6c6' }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project - Super Admin Portal
        </p>
      </footer>
    </>
  );
}
