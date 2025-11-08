'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Guarantee {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    companies: number;
  };
}

interface Props {
  initialGuarantees: Guarantee[];
  canEdit: boolean;
  userRole: string;
}

export default function GuaranteeList({ initialGuarantees, canEdit, userRole }: Props) {
  const router = useRouter();
  const [guarantees, setGuarantees] = useState<Guarantee[]>(initialGuarantees);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<Guarantee | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Suche filtern
  const filteredGuarantees = guarantees.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal öffnen (Neu oder Bearbeiten)
  const openModal = (guarantee?: Guarantee) => {
    if (guarantee) {
      setEditingGuarantee(guarantee);
      setFormData({ 
        name: guarantee.name, 
        description: guarantee.description || '' 
      });
    } else {
      setEditingGuarantee(null);
      setFormData({ name: '', description: '' });
    }
    setError('');
    setShowModal(true);
  };

  // Modal schließen
  const closeModal = () => {
    setShowModal(false);
    setEditingGuarantee(null);
    setFormData({ name: '', description: '' });
    setError('');
  };

  // Speichern (Erstellen oder Aktualisieren)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = editingGuarantee 
        ? `/api/guarantees/${editingGuarantee.id}`
        : '/api/guarantees';
      
      const method = editingGuarantee ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Fehler beim Speichern');
        setLoading(false);
        return;
      }

      // State aktualisieren
      if (editingGuarantee) {
        setGuarantees(guarantees.map(g => 
          g.id === editingGuarantee.id 
            ? { ...data, _count: g._count || { companies: 0 } }
            : g
        ));
      } else {
        setGuarantees([...guarantees, { 
          ...data, 
          _count: { companies: 0 } 
        }]);
      }

      closeModal();
      setLoading(false);
      router.refresh();
    } catch (err) {
      setError('Netzwerkfehler');
      setLoading(false);
    }
  };

  // Löschen
  const handleDelete = async (guarantee: Guarantee) => {
    const companyCount = guarantee._count?.companies || 0;
    let confirmMessage = `Möchten Sie die Bürgschaft "${guarantee.name}" wirklich löschen?`;
    
    if (companyCount > 0) {
      confirmMessage += `\n\nWARNUNG: Diese Bürgschaft wird von ${companyCount} Firma(en) verwendet!`;
    }

    if (!confirm(confirmMessage)) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/guarantees/${guarantee.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Fehler beim Löschen');
        setLoading(false);
        return;
      }

      // Aus State entfernen
      setGuarantees(guarantees.filter(g => g.id !== guarantee.id));
      setLoading(false);
      router.refresh();
    } catch (err) {
      alert('Netzwerkfehler');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Search Bar & Add Button */}
      <div className="bg-white mb-4 p-3 border border-[#c6c6c6] rounded-sm">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Bürgschaften suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm pr-8 focus:border-[#0076bc] focus:outline-none"
            />
            <svg
              className="absolute right-2 top-1.5 text-gray-400 pointer-events-none"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Counter */}
          <div className="text-xs text-[#525252] whitespace-nowrap">
            {filteredGuarantees.length} {filteredGuarantees.length === 1 ? 'Bürgschaft' : 'Bürgschaften'}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neue Bürgschaft
            </button>
          )}
        </div>
      </div>

      {/* Guarantees Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredGuarantees.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchTerm ? 'Keine Bürgschaften gefunden' : 'Noch keine Bürgschaften vorhanden'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Bürgschaft
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Unternehmen
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Status
                  </th>
                  {canEdit && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#525252] uppercase tracking-wider">
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredGuarantees.map((guarantee, index) => (
                  <tr 
                    key={guarantee.id} 
                    className={`${index !== filteredGuarantees.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-sm text-[#525252]">{guarantee.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">{guarantee.description || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">
                        {guarantee._count?.companies || 0} {guarantee._count?.companies === 1 ? 'Firma' : 'Firmen'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded ${
                        guarantee.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {guarantee.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => openModal(guarantee)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-2"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(guarantee)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#d32f2f] text-[#d32f2f] bg-transparent transition-all hover:bg-[#d32f2f] hover:text-white"
                        >
                          Löschen
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-sm border border-[#c6c6c6] max-w-md w-full shadow-lg">
            <div className="p-4">
              <h2 className="text-lg font-bold text-[#525252] mb-4">
                {editingGuarantee ? 'Bürgschaft bearbeiten' : 'Neue Bürgschaft'}
              </h2>

              {error && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-sm text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. Verag AT"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm min-h-[60px] focus:border-[#0076bc] focus:outline-none"
                    rows={3}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#525252] text-[#525252] bg-transparent transition-all hover:bg-[#525252] hover:text-white"
                    disabled={loading}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white"
                    disabled={loading}
                  >
                    {loading ? 'Speichert...' : 'Speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}