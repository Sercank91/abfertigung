'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface OnlineUser {
  user: User;
  currentPath: string | null;
  lastSeenAt: string;
}

interface TenantData {
  tenant: {
    id: string;
    name: string;
    domain: string;
  };
  onlineUsers: OnlineUser[];
  totalOnline: number;
}

interface LiveData {
  totalOnlineUsers: number;
  tenantsWithOnlineUsers: number;
  byTenant: TenantData[];
}

export default function LiveStatsPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/live');
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Fehler beim Laden der Live-Daten:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData();
    }, 10000); // Alle 10 Sekunden aktualisieren

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `vor ${diffSeconds}s`;
    if (diffSeconds < 3600) return `vor ${Math.floor(diffSeconds / 60)}m`;
    return date.toLocaleTimeString('de-DE');
  };

  const getPathLabel = (path: string | null) => {
    if (!path) return 'Unbekannt';
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/dashboard/clearances/new')) return 'Neue Abfertigung';
    if (path.startsWith('/dashboard/clearances/')) return 'Abfertigung Details';
    if (path.startsWith('/dashboard/clearances')) return 'Abfertigungen';
    if (path.startsWith('/dashboard/companies')) return 'Firmen';
    if (path.startsWith('/dashboard/guarantees')) return 'Bürgschaften';
    if (path.startsWith('/dashboard/routes')) return 'Routen';
    if (path.startsWith('/dashboard/employees')) return 'Mitarbeiter';
    if (path.startsWith('/dashboard/profile')) return 'Profil';
    return path;
  };

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
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Live-Statistiken
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            Echtzeit-Übersicht aller Online-User
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => loadData()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Aktualisieren
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-Refresh (10s)
              </label>
            </div>
          </div>

          {/* Summary Cards */}
          {data && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Online User (Gesamt)</p>
                    <p className="text-3xl font-bold text-gray-900">{data.totalOnlineUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Aktive Tenants</p>
                    <p className="text-3xl font-bold text-gray-900">{data.tenantsWithOnlineUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tenants with Online Users */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Lade Live-Daten...</p>
            </div>
          ) : data && data.byTenant.length > 0 ? (
            <div className="space-y-6">
              {data.byTenant.map((tenantData) => (
                <div key={tenantData.tenant.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tenantData.tenant.name}
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">{tenantData.tenant.domain}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {tenantData.totalOnline} online
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {tenantData.onlineUsers.map((onlineUser) => (
                      <div key={onlineUser.user.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {onlineUser.user.firstName[0]}{onlineUser.user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {onlineUser.user.firstName} {onlineUser.user.lastName}
                              </p>
                              <p className="text-xs text-gray-600">
                                @{onlineUser.user.username} · {onlineUser.user.role}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {getPathLabel(onlineUser.currentPath)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(onlineUser.lastSeenAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Keine Online-User
              </h3>
              <p className="text-gray-600">
                Aktuell sind keine User online. User gelten als online, wenn sie in den letzten 2 Minuten aktiv waren.
              </p>
            </div>
          )}
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

