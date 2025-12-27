'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Guarantee {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
  country: string;
  address: string;
  postalCode: string;
  city: string;
  emails: string[];
  phones: string[];
  isActive: boolean;
  guarantees?: Guarantee[];
  _count: {
    clearances: number;
    guarantees: number;
  };
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
}

export default function TenantCompaniesPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [guarantees, setGuarantees] = useState<Guarantee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    country: '',
    address: '',
    postalCode: '',
    city: '',
    emails: '',
    phones: '',
    guaranteeIds: [] as string[]
  });
  const [editCompany, setEditCompany] = useState({
    name: '',
    country: '',
    address: '',
    postalCode: '',
    city: '',
    emails: '',
    phones: '',
    guaranteeIds: [] as string[]
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const [tenantRes, companiesRes, guaranteesRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}`),
        fetch(`/api/admin/tenant-data/${tenantId}/companies`),
        fetch(`/api/admin/tenant-data/${tenantId}/guarantees`)
      ]);

      const tenantData = await tenantRes.json();
      const companiesData = await companiesRes.json();
      const guaranteesData = await guaranteesRes.json();

      setTenant(tenantData.tenant);
      setCompanies(companiesData.companies || []);
      setGuarantees(guaranteesData.guarantees || []);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompany.name,
          country: newCompany.country,
          address: newCompany.address,
          postalCode: newCompany.postalCode,
          city: newCompany.city,
          emails: newCompany.emails.split(',').map(e => e.trim()).filter(e => e),
          phones: newCompany.phones.split(',').map(p => p.trim()).filter(p => p),
          guaranteeIds: newCompany.guaranteeIds
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowCreateModal(false);
      setNewCompany({
        name: '',
        country: '',
        address: '',
        postalCode: '',
        city: '',
        emails: '',
        phones: '',
        guaranteeIds: []
      });
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditCompany = (company: Company) => {
    console.log('Edit company:', company);
    const companyGuaranteeIds = company.guarantees ? company.guarantees.map(g => g.id) : [];
    console.log('Company guarantee IDs:', companyGuaranteeIds);
    
    setSelectedCompany(company);
    setEditCompany({
      name: company.name,
      country: company.country,
      address: company.address,
      postalCode: company.postalCode,
      city: company.city,
      emails: Array.isArray(company.emails) ? company.emails.join(', ') : '',
      phones: Array.isArray(company.phones) ? company.phones.join(', ') : '',
      guaranteeIds: companyGuaranteeIds
    });
    setShowEditModal(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCompany) return;

    try {
      const payload = {
        name: editCompany.name,
        country: editCompany.country,
        address: editCompany.address,
        postalCode: editCompany.postalCode,
        city: editCompany.city,
        emails: editCompany.emails.split(',').map(e => e.trim()).filter(e => e),
        phones: editCompany.phones.split(',').map(p => p.trim()).filter(p => p),
        guaranteeIds: editCompany.guaranteeIds
      };

      console.log('Update payload:', payload);

      const response = await fetch(`/api/admin/tenant-data/${tenantId}/companies/${selectedCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      let data;
      try {
        data = await response.json();
        console.log('Update response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Ungültige Server-Antwort');
      }

      if (!response.ok) {
        console.error('Update failed:', response.status, data);
        throw new Error(data.error || `Fehler beim Aktualisieren (${response.status})`);
      }

      // Erfolg!
      console.log('Update successful!');
      setShowEditModal(false);
      setSelectedCompany(null);
      setError('');
      await loadData();
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Unbekannter Fehler beim Aktualisieren');
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Möchten Sie die Firma "${company.name}" wirklich KOMPLETT löschen?\n\nAchtung: Diese Firma hat ${company._count.clearances} Abfertigung(en)!\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/companies/${company.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !company.isActive })
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
              {tenant.name} - Firmenverwaltung
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
            <h3 className="text-lg font-semibold text-gray-900">Firmen / Kunden ({companies.length})</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Firma
            </button>
          </div>

          {/* Companies Table */}
          {companies.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Land</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ort</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Abfertigungen</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{company.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{company.country}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{company.postalCode} {company.city}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          company.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{company._count.clearances}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditCompany(company)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleToggleActive(company)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              company.isActive
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {company.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company)}
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
              Keine Firmen vorhanden
            </div>
          )}
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Firma bearbeiten: {selectedCompany.name}</h3>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                  <input
                    type="text"
                    value={editCompany.name}
                    onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land *</label>
                  <input
                    type="text"
                    value={editCompany.country}
                    onChange={(e) => setEditCompany({ ...editCompany, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. CH, DE, AT"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
                  <input
                    type="text"
                    value={editCompany.postalCode}
                    onChange={(e) => setEditCompany({ ...editCompany, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input
                    type="text"
                    value={editCompany.address}
                    onChange={(e) => setEditCompany({ ...editCompany, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                  <input
                    type="text"
                    value={editCompany.city}
                    onChange={(e) => setEditCompany({ ...editCompany, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mails (kommagetrennt)</label>
                  <input
                    type="text"
                    value={editCompany.emails}
                    onChange={(e) => setEditCompany({ ...editCompany, emails: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummern (kommagetrennt)</label>
                  <input
                    type="text"
                    value={editCompany.phones}
                    onChange={(e) => setEditCompany({ ...editCompany, phones: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+41 12 345 67 89, +41 98 765 43 21"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bürgschaften</label>
                  <div className="border border-gray-300 rounded p-3 max-h-40 overflow-y-auto">
                    {guarantees.length > 0 ? (
                      guarantees.map((guarantee) => (
                        <label key={guarantee.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={editCompany.guaranteeIds.includes(guarantee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditCompany({
                                  ...editCompany,
                                  guaranteeIds: [...editCompany.guaranteeIds, guarantee.id]
                                });
                              } else {
                                setEditCompany({
                                  ...editCompany,
                                  guaranteeIds: editCompany.guaranteeIds.filter(id => id !== guarantee.id)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{guarantee.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Keine Bürgschaften verfügbar</p>
                    )}
                  </div>
                </div>
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
                    setSelectedCompany(null);
                    setError('');
                    setEditCompany({
                      name: '',
                      country: '',
                      address: '',
                      postalCode: '',
                      city: '',
                      emails: '',
                      phones: '',
                      guaranteeIds: []
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
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Neue Firma erstellen</h3>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Musterfirma AG"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land *</label>
                  <input
                    type="text"
                    value={newCompany.country}
                    onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. CH, DE, AT"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ *</label>
                  <input
                    type="text"
                    value={newCompany.postalCode}
                    onChange={(e) => setNewCompany({ ...newCompany, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8000"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input
                    type="text"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Musterstrasse 123"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                  <input
                    type="text"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zürich"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mails (kommagetrennt)</label>
                  <input
                    type="text"
                    value={newCompany.emails}
                    onChange={(e) => setNewCompany({ ...newCompany, emails: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummern (kommagetrennt)</label>
                  <input
                    type="text"
                    value={newCompany.phones}
                    onChange={(e) => setNewCompany({ ...newCompany, phones: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+41 12 345 67 89, +41 98 765 43 21"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bürgschaften</label>
                  <div className="border border-gray-300 rounded p-3 max-h-40 overflow-y-auto">
                    {guarantees.length > 0 ? (
                      guarantees.map((guarantee) => (
                        <label key={guarantee.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={newCompany.guaranteeIds.includes(guarantee.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCompany({
                                  ...newCompany,
                                  guaranteeIds: [...newCompany.guaranteeIds, guarantee.id]
                                });
                              } else {
                                setNewCompany({
                                  ...newCompany,
                                  guaranteeIds: newCompany.guaranteeIds.filter(id => id !== guarantee.id)
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{guarantee.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Keine Bürgschaften verfügbar</p>
                    )}
                  </div>
                </div>
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
                    setNewCompany({
                      name: '',
                      country: '',
                      address: '',
                      postalCode: '',
                      city: '',
                      emails: '',
                      phones: '',
                      guaranteeIds: []
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

