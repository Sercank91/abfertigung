'use client';

import { useState, useMemo } from 'react';
import { transliterate } from '@/lib/transliterate';

/**
 * CustomsOfficeSelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl einer Zollstelle
 * Wird 3x verwendet: Grenzzollstelle, Versandzollstelle, Ankunftszollstelle
 */

interface CustomsOffice {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  city?: string;
  address?: string;
}

export type CustomsOfficeType = 'departure' | 'dispatch' | 'destination';

interface CustomsOfficeSelectorProps {
  // Typ der Zollstelle (für Label und Styling)
  type: CustomsOfficeType;

  // Ausgewählte Zollstelle
  selectedCode?: string;
  selectedName?: string;
  selectedCountry?: string;
  selectedId?: string;

  // Callback wenn eine Zollstelle ausgewählt wird
  onSelect: (office: CustomsOffice) => void;

  // Callback zum Löschen der Auswahl
  onClear: () => void;

  // Liste aller verfügbaren Zollstellen
  customsOffices: CustomsOffice[];

  // Zusätzliche Felder für Dispatch/Destination
  additionalFields?: React.ReactNode;

  // Optional: Breite des Labels
  labelWidth?: string;
}

// Konfiguration für jeden Typ
const typeConfig = {
  departure: {
    label: 'Grenzzollstelle',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-600',
    hoverTextColor: 'hover:text-red-800',
  },
  dispatch: {
    label: 'Versandzollstelle',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-600',
    hoverTextColor: 'hover:text-blue-800',
  },
  destination: {
    label: 'Ankunftszollstelle',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-600',
    hoverTextColor: 'hover:text-green-800',
  },
};

export default function CustomsOfficeSelector({
  type,
  selectedCode,
  selectedName,
  selectedCountry,
  selectedId,
  onSelect,
  onClear,
  customsOffices,
  additionalFields,
  labelWidth = 'w-48',
}: CustomsOfficeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const config = typeConfig[type];

  // Gefilterte Zollstellen basierend auf Suchbegriff
  const filteredOffices = useMemo(() => {
    if (searchTerm.length < 2) return [];

    const search = searchTerm.toLowerCase();
    return customsOffices.filter(
      (office) =>
        office.code.toLowerCase().includes(search) ||
        office.name.toLowerCase().includes(search) ||
        office.countryCode.toLowerCase().includes(search)
    );
  }, [customsOffices, searchTerm]);

  const handleSelect = (office: CustomsOffice) => {
    onSelect(office);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
  };

  return (
    <div className="space-y-2">
      {/* Main Selector */}
      <div className="flex items-center gap-4">
        <label className={`${labelWidth} text-sm font-medium text-gray-700`}>
          {config.label}*
        </label>
        <div className="flex-1 relative">
          {selectedCode ? (
            // Selected Office Display
            <div
              className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded ${config.bgColor}`}
            >
              <span className="flex-1 font-mono text-sm">
                {selectedCode} - {transliterate(selectedName || '')}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className={`${config.textColor} ${config.hoverTextColor} font-bold text-xl`}
                aria-label="Löschen"
              >
                ×
              </button>
            </div>
          ) : (
            // Search Input with Dropdown
            <>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Mindestens 2 Zeichen..."
              />

              {/* Autocomplete Dropdown */}
              {showDropdown && searchTerm.length >= 2 && filteredOffices.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                  {filteredOffices.map((office) => (
                    <div
                      key={office.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(office);
                      }}
                      className={`px-4 py-3 ${config.hoverColor} cursor-pointer border-b last:border-b-0 transition-colors`}
                    >
                      <div className="font-medium">
                        {office.code} - {transliterate(office.name)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {office.countryCode}
                        {office.city && ` • ${office.city}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showDropdown && searchTerm.length >= 2 && filteredOffices.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-4">
                  <p className="text-sm text-gray-500 text-center">Keine Zollstellen gefunden</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Additional Fields (für Dispatch und Destination) */}
      {additionalFields && selectedCode && (
        <div className="pl-4 ml-48 border-l-2 border-gray-200">
          {additionalFields}
        </div>
      )}
    </div>
  );
}
