'use client';

import { useState } from 'react';

interface GoodsLocation {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GoodsLocationListProps {
  initialGoodsLocations: GoodsLocation[];
  canEdit: boolean;
  userRole: string;
}

export default function GoodsLocationList({
  initialGoodsLocations,
  canEdit,
  userRole,
}: GoodsLocationListProps) {
  const [goodsLocations, setGoodsLocations] = useState<GoodsLocation[]>(initialGoodsLocations);
  const [filteredLocations, setFilteredLocations] = useState<GoodsLocation[]>(initialGoodsLocations);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<GoodsLocation | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = goodsLocations.filter(
      (location) =>
        location.name.toLowerCase().includes(value.toLowerCase()) ||
        location.code?.toLowerCase().includes(value.toLowerCase()) ||
        location.description?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredLocations(filtered);
  };

  const fetchGoodsLocations = async () => {
    try {
      const response = await fetch('/api/goods-locations', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setGoodsLocations(data.goodsLocations);
        setFilteredLocations(data.goodsLocations);
      }
    } catch (error) {
      console.error('Error fetching goods locations:', error);
    }
  };

  const handleOpenModal = (location?: GoodsLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        code: location.code || '',
        description: location.description || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        code: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      code: '',
      description: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }

    setLoading(true);

    try {
      const url = editingLocation
        ? `/api/goods-locations/${editingLocation.id}`
        : '/api/goods-locations';
      const method = editingLocation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchGoodsLocations();
        handleCloseModal();
      } else {
        const data = await response.json();
        alert(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving goods location:', error);
      alert('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Möchten Sie diesen Warenort wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/goods-locations/${locationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchGoodsLocations();
      } else {
        alert('Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting goods location:', error);
      alert('Fehler beim Löschen');
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
              placeholder="Warenorte suchen..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
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
            {filteredLocations.length} {filteredLocations.length === 1 ? 'Warenort' : 'Warenorte'}
          </div>

          {/* Add Button */}
          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Warenort
            </button>
          )}
        </div>
      </div>

      {/* Goods Locations Table */}
      <div className="bg-white border border-[#c6c6c6] rounded-sm overflow-hidden">
        {filteredLocations.length === 0 ? (
          <div className="text-center py-12 text-[#525252] text-sm">
            {searchTerm ? 'Keine Warenorte gefunden' : 'Noch keine Warenorte erstellt'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#f2f2f2] border-b border-[#c6c6c6]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-[#525252] uppercase tracking-wider">
                    Beschreibung
                  </th>
                  {canEdit && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[#525252] uppercase tracking-wider">
                      Aktionen
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredLocations.map((location, index) => (
                  <tr 
                    key={location.id} 
                    className={`${index !== filteredLocations.length - 1 ? 'border-b border-[#e6e6e6]' : ''} hover:bg-[#f9f9f9] transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-sm text-[#525252]">{location.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">{location.code || '-'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[#525252]">
                        {location.description || '-'}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleOpenModal(location)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded border border-[#0076bc] text-[#0076bc] bg-transparent transition-all hover:bg-[#0076bc] hover:text-white mr-2"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(location.id)}
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
      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-sm border border-[#c6c6c6] max-w-md w-full shadow-lg">
            <div className="p-4">
              <h2 className="text-lg font-bold text-[#525252] mb-4">
                {editingLocation ? 'Warenort bearbeiten' : 'Neuer Warenort'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
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
                    placeholder="z.B. Asfinag - 433"
                    required
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block font-semibold text-sm mb-1 text-[#525252]">
                    Code (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-[#c6c6c6] rounded-sm focus:border-[#0076bc] focus:outline-none"
                    placeholder="z.B. 433"
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
                    onClick={handleCloseModal}
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
                    {loading ? 'Speichert...' : (editingLocation ? 'Speichern' : 'Erstellen')}
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