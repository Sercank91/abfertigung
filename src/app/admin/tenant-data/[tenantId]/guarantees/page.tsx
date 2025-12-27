'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Guarantee {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: {
    companies: number;
  };
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
}

export default function TenantGuaranteesPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGuarantee, setSelectedGuarantee] = useState<Guarantee | null>(null);
  const [newGuarantee, setNewGuarantee] = useState({
    name: '',
    description: ''
  });
  const [editGuarantee, setEditGuarantee] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const [tenantRes, guaranteesRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}`),
        fetch(`/api/admin/tenant-data/${tenantId}/guarantees`)
      ]);

      const tenantData = await tenantRes.json();
      const guaranteesData = await guaranteesRes.json();

      setTenant(tenantData.tenant);
      setGuarantees(guaranteesData.guarantees || []);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuarantee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/guarantees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuarantee)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowCreateModal(false);
      setNewGuarantee({
        name: '',
        description: ''
      });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditGuarantee = (guarantee: Guarantee) => {
    setSelectedGuarantee(guarantee);
    setEditGuarantee({
      name: guarantee.name,
      description: guarantee.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateGuarantee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedGuarantee) return;

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/guarantees/${selectedGuarantee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editGuarantee)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setShowEditModal(false);
      setSelectedGuarantee(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGuarantee = async (guarantee: Guarantee) => {
    const companyCount = guarantee._count?.companies || 0;
    let confirmMessage = `Möchten Sie die Bürgschaft "${guarantee.name}" wirklich KOMPLETT löschen?`;
    
    if (companyCount > 0) {
      confirmMessage += `\n\nWARNUNG: Diese Bürgschaft wird von ${companyCount} Firma(en) verwendet!\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`;
    } else {
      confirmMessage += '\n\nDieser Vorgang kann nicht rückgängig gemacht werden!';
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/guarantees/${guarantee.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Löschen');
      }
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const handleToggleActive = async (guarantee: Guarantee) => {
    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/guarantees/${guarantee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !guarantee.isActive })
      });

      if (response.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren:', err);
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
              {tenant.name} - Bürgschaftenverwaltung
            </h2>
            <span className="text-gray-600 text-sm leading-none mb-0.5 font-mono">
              {tenant.domain}
            </span>
          </div>
          <Link href={`/admin/tenant-data/${tenantId}`}>
            <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
              ← Zurück zu Tenant-Daten
            </button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Actions Bar */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Bürgschaften ({guarantees.length})</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Bürgschaft
            </button>
          </div>

          {/* Guarantees Table */}
          {guarantees.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Firmen</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {guarantees.map((guarantee) => (
                    <tr key={guarantee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{guarantee.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{guarantee.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {guarantee._count?.companies || 0} {guarantee._count?.companies === 1 ? 'Firma' : 'Firmen'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          guarantee.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {guarantee.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditGuarantee(guarantee)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleToggleActive(guarantee)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              guarantee.isActive
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {guarantee.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                          <button
                            onClick={() => handleDeleteGuarantee(guarantee)}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
              Keine Bürgschaften vorhanden
            </div>
          )}
        </div>
      </div>

      {/* Edit Guarantee Modal */}
      {showEditModal && selectedGuarantee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Bürgschaft bearbeiten: {selectedGuarantee.name}</h3>
            <form onSubmit={handleUpdateGuarantee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editGuarantee.name}
                  onChange={(e) => setEditGuarantee({ ...editGuarantee, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                <textarea
                  value={editGuarantee.description}
                  onChange={(e) => setEditGuarantee({ ...editGuarantee, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedGuarantee(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Guarantee Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Neue Bürgschaft erstellen</h3>
            <form onSubmit={handleCreateGuarantee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newGuarantee.name}
                  onChange={(e) => setNewGuarantee({ ...newGuarantee, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Verag AT"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                <textarea
                  value={newGuarantee.description}
                  onChange={(e) => setNewGuarantee({ ...newGuarantee, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                    setNewGuarantee({
                      name: '',
                      description: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

