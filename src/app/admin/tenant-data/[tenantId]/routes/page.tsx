'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CustomsOffice {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  city: string | null;
}

interface RouteTransitOffice {
  id: string;
  order: number;
  customsOffice: CustomsOffice;
}

interface Route {
  id: string;
  name: string;
  description: string | null;
  countries: string[];
  isActive: boolean;
  transitOffices: RouteTransitOffice[];
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
}

// Transliteration: Kyrillisch & Griechisch → Latein
function transliterate(text: string): string {
  const toLatin: { [key: string]: string } = {
    // Bulgarisch & Russisch (Kyrillisch)
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v', 'Г': 'G', 'г': 'g',
    'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e', 'Ж': 'Zh', 'ж': 'zh', 'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k', 'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n', 'О': 'O', 'о': 'o', 'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r', 'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f', 'Х': 'H', 'х': 'h', 'Ц': 'Ts', 'ц': 'ts', 'Ч': 'Ch', 'ч': 'ch',
    'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Sht', 'щ': 'sht', 'Ъ': 'A', 'ъ': 'a', 'Ь': '', 'ь': '',
    'Ю': 'Yu', 'ю': 'yu', 'Я': 'Ya', 'я': 'ya', 'Ё': 'Yo', 'ё': 'yo', 'Ы': 'Y', 'ы': 'y',
    'Э': 'E', 'э': 'e',
    // Griechisch
    'Α': 'A', 'α': 'a', 'Β': 'V', 'β': 'v', 'Γ': 'G', 'γ': 'g', 'Δ': 'D', 'δ': 'd',
    'Ε': 'E', 'ε': 'e', 'Ζ': 'Z', 'ζ': 'z', 'Η': 'I', 'η': 'i', 'Θ': 'Th', 'θ': 'th',
    'Ι': 'I', 'ι': 'i', 'Κ': 'K', 'κ': 'k', 'Λ': 'L', 'λ': 'l', 'Μ': 'M', 'μ': 'm',
    'Ν': 'N', 'ν': 'n', 'Ξ': 'X', 'ξ': 'x', 'Ο': 'O', 'ο': 'o', 'Π': 'P', 'π': 'p',
    'Ρ': 'R', 'ρ': 'r', 'Σ': 'S', 'σ': 's', 'ς': 's', 'Τ': 'T', 'τ': 't', 'Υ': 'Y', 'υ': 'y',
    'Φ': 'F', 'φ': 'f', 'Χ': 'Ch', 'χ': 'ch', 'Ψ': 'Ps', 'ψ': 'ps', 'Ω': 'O', 'ω': 'o',
  };
  return text.split('').map(char => toLatin[char] || char).join('');
}

export default function TenantRoutesPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  // Form state
  const [newRoute, setNewRoute] = useState({
    name: '',
    description: '',
    countries: [] as string[],
    transitOfficeIds: [] as string[]
  });
  const [editRoute, setEditRoute] = useState({
    name: '',
    description: '',
    countries: [] as string[],
    transitOfficeIds: [] as string[]
  });
  
  // Country & Office state
  const [countryInput, setCountryInput] = useState('');
  const [editCountryInput, setEditCountryInput] = useState('');
  const [officeSearch, setOfficeSearch] = useState('');
  const [editOfficeSearch, setEditOfficeSearch] = useState('');
  const [officeSearchResults, setOfficeSearchResults] = useState<CustomsOffice[]>([]);
  const [editOfficeSearchResults, setEditOfficeSearchResults] = useState<CustomsOffice[]>([]);
  const [selectedOffices, setSelectedOffices] = useState<CustomsOffice[]>([]);
  const [editSelectedOffices, setEditSelectedOffices] = useState<CustomsOffice[]>([]);
  
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      const [tenantRes, routesRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}`),
        fetch(`/api/admin/tenant-data/${tenantId}/routes`)
      ]);

      const tenantData = await tenantRes.json();
      const routesData = await routesRes.json();

      setTenant(tenantData.tenant);
      setRoutes(routesData.routes || []);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce hook für API-basierte Suche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (officeSearch && officeSearch.length >= 2) {
        searchCustomsOfficesAPI(officeSearch, false);
      } else {
        setOfficeSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [officeSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editOfficeSearch && editOfficeSearch.length >= 2) {
        searchCustomsOfficesAPI(editOfficeSearch, true);
      } else {
        setEditOfficeSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editOfficeSearch]);

  const searchCustomsOfficesAPI = async (search: string, isEdit: boolean = false) => {
    if (!search || search.length < 2) {
      if (isEdit) {
        setEditOfficeSearchResults([]);
      } else {
        setOfficeSearchResults([]);
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/customs-offices?search=${encodeURIComponent(search)}&limit=50`
      );
      const data = await response.json();
      
      if (isEdit) {
        setEditOfficeSearchResults(data.offices || []);
      } else {
        setOfficeSearchResults(data.offices || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zollstellen:', error);
      if (isEdit) {
        setEditOfficeSearchResults([]);
      } else {
        setOfficeSearchResults([]);
      }
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newRoute.countries.length === 0) {
      setError('Bitte fügen Sie mindestens ein Land hinzu');
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoute)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setShowCreateModal(false);
      setNewRoute({
        name: '',
        description: '',
        countries: [],
        transitOfficeIds: []
      });
      setSelectedOffices([]);
      setCountryInput('');
      setOfficeSearch('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setEditRoute({
      name: route.name,
      description: route.description || '',
      countries: route.countries,
      transitOfficeIds: route.transitOffices.map(to => to.customsOffice.id)
    });
    setEditSelectedOffices(route.transitOffices.map(to => to.customsOffice));
    setShowEditModal(true);
  };

  const handleUpdateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRoute) return;

    if (editRoute.countries.length === 0) {
      setError('Bitte fügen Sie mindestens ein Land hinzu');
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/routes/${selectedRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRoute)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setShowEditModal(false);
      setSelectedRoute(null);
      setEditSelectedOffices([]);
      setEditCountryInput('');
      setEditOfficeSearch('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRoute = async (route: Route) => {
    if (!confirm(`Möchten Sie die Route "${route.name}" wirklich KOMPLETT löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/routes/${route.id}`, {
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

  const handleToggleActive = async (route: Route) => {
    try {
      const response = await fetch(`/api/admin/tenant-data/${tenantId}/routes/${route.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !route.isActive })
      });

      if (response.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Fehler beim Aktualisieren:', err);
    }
  };

  // Helper functions for create modal
  const handleAddCountry = () => {
    const country = countryInput.trim().toUpperCase();
    if (country && country.length === 2 && !newRoute.countries.includes(country)) {
      setNewRoute({
        ...newRoute,
        countries: [...newRoute.countries, country]
      });
      setCountryInput('');
    }
  };

  const handleRemoveCountry = (country: string) => {
    setNewRoute({
      ...newRoute,
      countries: newRoute.countries.filter(c => c !== country)
    });
  };

  const handleAddOffice = (office: CustomsOffice) => {
    if (!selectedOffices.find(o => o.id === office.id)) {
      setSelectedOffices([...selectedOffices, office]);
      setNewRoute({
        ...newRoute,
        transitOfficeIds: [...newRoute.transitOfficeIds, office.id]
      });
    }
    setOfficeSearch('');
    setOfficeSearchResults([]);
  };

  const handleRemoveOffice = (officeId: string) => {
    setSelectedOffices(selectedOffices.filter(o => o.id !== officeId));
    setNewRoute({
      ...newRoute,
      transitOfficeIds: newRoute.transitOfficeIds.filter(id => id !== officeId)
    });
  };

  // Helper functions for edit modal
  const handleEditAddCountry = () => {
    const country = editCountryInput.trim().toUpperCase();
    if (country && country.length === 2 && !editRoute.countries.includes(country)) {
      setEditRoute({
        ...editRoute,
        countries: [...editRoute.countries, country]
      });
      setEditCountryInput('');
    }
  };

  const handleEditRemoveCountry = (country: string) => {
    setEditRoute({
      ...editRoute,
      countries: editRoute.countries.filter(c => c !== country)
    });
  };

  const handleEditAddOffice = (office: CustomsOffice) => {
    if (!editSelectedOffices.find(o => o.id === office.id)) {
      setEditSelectedOffices([...editSelectedOffices, office]);
      setEditRoute({
        ...editRoute,
        transitOfficeIds: [...editRoute.transitOfficeIds, office.id]
      });
    }
    setEditOfficeSearch('');
    setEditOfficeSearchResults([]);
  };

  const handleEditRemoveOffice = (officeId: string) => {
    setEditSelectedOffices(editSelectedOffices.filter(o => o.id !== officeId));
    setEditRoute({
      ...editRoute,
      transitOfficeIds: editRoute.transitOfficeIds.filter(id => id !== officeId)
    });
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
              {tenant.name} - Routenverwaltung
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
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Actions Bar */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Routen ({routes.length})</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Route
            </button>
          </div>

          {/* Routes Table */}
          {routes.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Länder</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Zollstellen</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{route.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{route.description || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {route.countries.map(country => (
                            <span key={country} className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                              {country}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 space-y-1">
                          {route.transitOffices.length === 0 ? (
                            <div>Keine Zollstellen</div>
                          ) : (
                            route.transitOffices.map(to => (
                              <div key={to.id}>
                                {to.customsOffice.code} - {transliterate(to.customsOffice.name)}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          route.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {route.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditRoute(route)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleToggleActive(route)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              route.isActive
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {route.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route)}
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
              Keine Routen vorhanden
            </div>
          )}
        </div>
      </div>

      {/* Edit Route Modal */}
      {showEditModal && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Route bearbeiten: {selectedRoute.name}</h3>
              <form onSubmit={handleUpdateRoute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editRoute.name}
                    onChange={(e) => setEditRoute({ ...editRoute, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                  <textarea
                    value={editRoute.description}
                    onChange={(e) => setEditRoute({ ...editRoute, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
                
                {/* Countries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Länder * (2-Buchstaben-Code)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editCountryInput}
                      onChange={(e) => setEditCountryInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditAddCountry();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. DE, AT, TR"
                      maxLength={2}
                    />
                    <button
                      type="button"
                      onClick={handleEditAddCountry}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Hinzufügen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editRoute.countries.map(country => (
                      <span key={country} className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                        {country}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveCountry(country)}
                          className="ml-2 text-blue-600 hover:text-blue-900 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transit Offices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transit-Zollstellen (optional)</label>
                  <input
                    type="text"
                    value={editOfficeSearch}
                    onChange={(e) => setEditOfficeSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    placeholder="Zollstelle suchen (Code oder Name)..."
                  />
                  
                  {/* Search Results */}
                  {editOfficeSearch && editOfficeSearchResults.length > 0 && (
                    <div className="border border-gray-300 rounded max-h-40 overflow-y-auto mb-2 bg-white">
                      {editOfficeSearchResults.map(office => (
                        <button
                          key={office.id}
                          type="button"
                          onClick={() => handleEditAddOffice(office)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm"
                        >
                          <div className="font-medium">{office.code} - {transliterate(office.name)}</div>
                          <div className="text-xs text-gray-500">{transliterate(office.city || '')} ({office.countryCode})</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Offices */}
                  <div className="space-y-2">
                    {editSelectedOffices.map((office, index) => (
                      <div key={office.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{office.code} - {transliterate(office.name)}</div>
                            <div className="text-xs text-gray-500">{transliterate(office.city || '')} ({office.countryCode})</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditRemoveOffice(office.id)}
                          className="text-red-600 hover:text-red-800 font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
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
                      setSelectedRoute(null);
                      setError('');
                      setEditSelectedOffices([]);
                      setEditCountryInput('');
                      setEditOfficeSearch('');
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
        </div>
      )}

      {/* Create Route Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Neue Route erstellen</h3>
              <form onSubmit={handleCreateRoute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Kapitan Andreevo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                  <textarea
                    value={newRoute.description}
                    onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
                
                {/* Countries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Länder * (2-Buchstaben-Code)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={countryInput}
                      onChange={(e) => setCountryInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCountry();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. DE, AT, TR"
                      maxLength={2}
                    />
                    <button
                      type="button"
                      onClick={handleAddCountry}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Hinzufügen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newRoute.countries.map(country => (
                      <span key={country} className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                        {country}
                        <button
                          type="button"
                          onClick={() => handleRemoveCountry(country)}
                          className="ml-2 text-blue-600 hover:text-blue-900 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Transit Offices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transit-Zollstellen (optional)</label>
                  <input
                    type="text"
                    value={officeSearch}
                    onChange={(e) => setOfficeSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    placeholder="Zollstelle suchen (Code oder Name)..."
                  />
                  
                  {/* Search Results */}
                  {officeSearch && officeSearchResults.length > 0 && (
                    <div className="border border-gray-300 rounded max-h-40 overflow-y-auto mb-2 bg-white">
                      {officeSearchResults.map(office => (
                        <button
                          key={office.id}
                          type="button"
                          onClick={() => handleAddOffice(office)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 text-sm"
                        >
                          <div className="font-medium">{office.code} - {transliterate(office.name)}</div>
                          <div className="text-xs text-gray-500">{transliterate(office.city || '')} ({office.countryCode})</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Offices */}
                  <div className="space-y-2">
                    {selectedOffices.map((office, index) => (
                      <div key={office.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{office.code} - {transliterate(office.name)}</div>
                            <div className="text-xs text-gray-500">{transliterate(office.city || '')} ({office.countryCode})</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOffice(office.id)}
                          className="text-red-600 hover:text-red-800 font-bold text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
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
                      setNewRoute({
                        name: '',
                        description: '',
                        countries: [],
                        transitOfficeIds: []
                      });
                      setSelectedOffices([]);
                      setCountryInput('');
                      setOfficeSearch('');
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

