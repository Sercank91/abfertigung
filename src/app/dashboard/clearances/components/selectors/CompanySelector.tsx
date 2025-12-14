'use client';

import { useState, useMemo } from 'react';

/**
 * CompanySelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl eines Transportunternehmens
 * mit Modal, Suchfunktion und bearbeitbaren Firmenadress-Feldern
 */

interface Company {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  guarantees?: any[];
}

interface CompanySelectorProps {
  // Ausgewählte Company-Daten
  companyId?: string;
  companyName?: string;
  companyAddress?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyCountry?: string;

  // Callback wenn eine Company ausgewählt wird
  onSelect: (company: Company) => void;

  // Callback für Field-Updates (beim Bearbeiten)
  onFieldChange: (field: string, value: string) => void;

  // Liste aller verfügbaren Companies
  companies: Company[];

  // Optional: Edit-Modus
  isEditing?: boolean;
  onEditToggle?: () => void;
}

export default function CompanySelector({
  companyId,
  companyName,
  companyAddress,
  companyPostalCode,
  companyCity,
  companyCountry,
  onSelect,
  onFieldChange,
  companies,
  isEditing = false,
  onEditToggle,
}: CompanySelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Gefilterte Companies basierend auf Suchbegriff
  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;

    const search = searchTerm.toLowerCase();
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(search) ||
        company.city.toLowerCase().includes(search) ||
        company.address.toLowerCase().includes(search)
    );
  }, [companies, searchTerm]);

  const handleSelect = (company: Company) => {
    onSelect(company);
    setIsModalOpen(false);
    setSearchTerm('');
  };

  const handleEditToggle = () => {
    if (onEditToggle) {
      onEditToggle();
    }
  };

  return (
    <>
      {/* Company Selector Field */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">
          Transportunternehmen*
        </label>
        <div className="flex-1">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={companyName || ''}
                  onChange={(e) => onFieldChange('companyName', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Firmenname"
                />
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Neu wählen
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={companyName || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
                  placeholder="Keine Firma ausgewählt"
                />
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {companyId ? 'Ändern' : 'Wählen'}
                </button>
              </>
            )}
          </div>

          {/* Company Details */}
          {companyId && (
            <div className="mt-1">
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={companyAddress || ''}
                    onChange={(e) => onFieldChange('companyAddress', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Adresse"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={companyPostalCode || ''}
                      onChange={(e) => onFieldChange('companyPostalCode', e.target.value)}
                      className="w-24 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="PLZ"
                    />
                    <input
                      type="text"
                      value={companyCity || ''}
                      onChange={(e) => onFieldChange('companyCity', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Ort"
                    />
                    <input
                      type="text"
                      value={companyCountry || ''}
                      onChange={(e) => onFieldChange('companyCountry', e.target.value)}
                      className="w-32 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Land"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {companyAddress}, {companyPostalCode} {companyCity}, {companyCountry}
                  </p>
                  {onEditToggle && (
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Bearbeiten
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Transportunternehmen wählen</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Schließen"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Search Input */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded mb-4 focus:ring-2 focus:ring-blue-500"
                placeholder="Firma suchen..."
                autoFocus
              />

              {/* Company List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredCompanies.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Keine Firmen gefunden
                  </p>
                ) : (
                  filteredCompanies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => handleSelect(company)}
                      className="p-4 border rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="font-bold">{company.name}</div>
                      <div className="text-sm text-gray-600">
                        {company.address}, {company.postalCode} {company.city}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{company.country}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
