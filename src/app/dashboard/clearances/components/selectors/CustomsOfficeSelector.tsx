'use client';

import { useState, useEffect } from 'react';
import { transliterate } from '@/lib/transliterate';
import { getCountryName } from '@/lib/utils/countries';

/**
 * CustomsOfficeSelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl einer Zollstelle
 * Wird 3x verwendet: Grenzzollstelle, Versandzollstelle, Ankunftszollstelle
 *
 * Implementiert API-basierte Suche mit Debouncing
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
  selectedCountryCode?: string;
  selectedId?: string;

  // Callback wenn eine Zollstelle ausgewählt wird
  onSelect: (office: CustomsOffice) => void;

  // Callback zum Löschen der Auswahl
  onClear: () => void;

  // Callbacks für Land/Länderkürzel Änderungen (nur dispatch/destination)
  onCountryChange?: (country: string) => void;
  onCountryCodeChange?: (countryCode: string) => void;

  // Optional: Breite des Labels
  labelWidth?: string;
}

// Simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
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
  selectedCountryCode,
  selectedId,
  onSelect,
  onClear,
  onCountryChange,
  onCountryCodeChange,
  labelWidth = 'w-32',
}: CustomsOfficeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [offices, setOffices] = useState<CustomsOffice[]>([]);
  const [loading, setLoading] = useState(false);

  const config = typeConfig[type];
  const debouncedSearch = useDebounce(searchTerm, 300);

  // API-basierte Suche mit Debouncing
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setOffices([]);
      return;
    }

    const loadOffices = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedSearch)}&limit=50`
        );
        const data = await response.json();
        setOffices(data.offices || []);
      } catch (error) {
        console.error('Fehler beim Laden der Zollstellen:', error);
        setOffices([]);
      } finally {
        setLoading(false);
      }
    };

    loadOffices();
  }, [debouncedSearch]);

  const handleSelect = (office: CustomsOffice) => {
    onSelect(office);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
  };

  // Zeige Extra-Felder nur für dispatch und destination
  const showExtraFields = (type === 'dispatch' || type === 'destination') && selectedCode;

  return (
    <div className="flex items-center gap-4">
      <label className={`${labelWidth} text-sm font-medium text-gray-700`}>
        {config.label}*
      </label>
      <div className="flex-1 flex gap-2">
        {selectedCode ? (
          // Selected Office Display with Extra Fields
          <>
            <div className="flex-1 relative">
              <div
                className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded ${config.bgColor}`}
              >
                <span className="flex-1 font-mono text-sm">
                  {selectedCode} - {transliterate(selectedName || '')}
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-red-600 hover:text-red-800 font-bold text-xl"
                  aria-label="Löschen"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Extra Fields für Dispatch und Destination */}
            {showExtraFields && (
              <>
                <input
                  type="text"
                  value={selectedCountry || ''}
                  onChange={(e) => onCountryChange?.(e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Deutschland"
                />
                <input
                  type="text"
                  maxLength={2}
                  value={selectedCountryCode || ''}
                  onChange={(e) => onCountryCodeChange?.(e.target.value.toUpperCase())}
                  className="w-16 px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="DE"
                />
              </>
            )}
          </>
        ) : (
          // Search Input with Dropdown
          <div className="flex-1 relative">
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

            {/* Loading Indicator */}
            {loading && searchTerm.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-4">
                <p className="text-sm text-gray-500 text-center">Suche...</p>
              </div>
            )}

            {/* Autocomplete Dropdown */}
            {showDropdown && !loading && searchTerm.length >= 2 && offices.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {offices.map((office) => (
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
                    <div className="text-xs text-gray-500">{office.countryCode}</div>
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {showDropdown && !loading && searchTerm.length >= 2 && offices.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-4">
                <p className="text-sm text-gray-500 text-center">Keine Zollstellen gefunden</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
