'use client';

import { useState, useEffect } from 'react';
import { transliterate } from '@/lib/transliterate';

/**
 * RouteSelector Component
 *
 * Komplexe Komponente für Route-Konfiguration mit:
 * - Auswahl gespeicherter Routen
 * - Custom Route Countries (Drag & Drop)
 * - Transit Offices (Drag & Drop + Suche mit API)
 */

  interface Route {
    id: string;
    name: string;
    countries: string[];
    transitOffices?: Array<{
      id: string;
      order: number;
      customsOffice: {
        id: string;
        code: string;
        name: string;
        countryCode: string;
      };
    }>;
  }

interface CustomsOffice {
  id: string;
  code: string;
  name: string;
  countryCode: string;
}

interface RouteSelectorProps {
  // Ausgewählte Route
  selectedRouteId?: string;
  selectedRouteName?: string;
  customRouteCountries: string[];
  transitOffices: string[];

  // Callbacks
  onRouteSelect: (route: Route) => void;
  onCountriesChange: (countries: string[]) => void;
  onTransitOfficesChange: (offices: string[]) => void;

  // Daten
  availableRoutes: Route[];
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

export default function RouteSelector({
  selectedRouteId,
  selectedRouteName,
  customRouteCountries,
  transitOffices,
  onRouteSelect,
  onCountriesChange,
  onTransitOfficesChange,
  availableRoutes,
}: RouteSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [transitSearch, setTransitSearch] = useState('');
  const [draggedCountryIndex, setDraggedCountryIndex] = useState<number | null>(null);
  const [draggedTransitIndex, setDraggedTransitIndex] = useState<number | null>(null);
  const [transitOfficesResults, setTransitOfficesResults] = useState<CustomsOffice[]>([]);
  const [loadingTransit, setLoadingTransit] = useState(false);

  const debouncedTransitSearch = useDebounce(transitSearch, 300);

  // API-basierte Transit-Offices Suche
  useEffect(() => {
    if (debouncedTransitSearch.length < 2) {
      setTransitOfficesResults([]);
      return;
    }

    const loadOffices = async () => {
      setLoadingTransit(true);
      try {
        const response = await fetch(
          `/api/customs-offices?search=${encodeURIComponent(debouncedTransitSearch)}&limit=50`
        );
        const data = await response.json();
        setTransitOfficesResults(data.offices || []);
      } catch (error) {
        console.error('Fehler beim Laden der Transit-Offices:', error);
        setTransitOfficesResults([]);
      } finally {
        setLoadingTransit(false);
      }
    };

    loadOffices();
  }, [debouncedTransitSearch]);

  // Route Selection Handler
  const handleRouteSelect = (route: Route) => {
    onRouteSelect(route);
  };

  // Country Management
  const addCustomCountry = () => {
    if (newCountry && newCountry.length === 2 && !customRouteCountries.includes(newCountry)) {
      onCountriesChange([...customRouteCountries, newCountry]);
      setNewCountry('');
    }
  };

  const removeCountry = (index: number) => {
    onCountriesChange(customRouteCountries.filter((_, i) => i !== index));
  };

  // Country Drag & Drop
  const handleCountryDragStart = (index: number) => {
    setDraggedCountryIndex(index);
  };

  const handleCountryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCountryIndex === null || draggedCountryIndex === index) return;

    const newCountries = [...customRouteCountries];
    const draggedItem = newCountries[draggedCountryIndex];
    newCountries.splice(draggedCountryIndex, 1);
    newCountries.splice(index, 0, draggedItem);

    onCountriesChange(newCountries);
    setDraggedCountryIndex(index);
  };

  const handleCountryDragEnd = () => {
    setDraggedCountryIndex(null);
  };

  // Transit Office Management
  const addTransitOffice = (office: CustomsOffice) => {
    if (!transitOffices.includes(office.code)) {
      onTransitOfficesChange([...transitOffices, office.code]);
      setTransitSearch('');
    }
  };

  const removeTransitOffice = (index: number) => {
    onTransitOfficesChange(transitOffices.filter((_, i) => i !== index));
  };

  // Transit Office Drag & Drop
  const handleTransitDragStart = (index: number) => {
    setDraggedTransitIndex(index);
  };

  const handleTransitDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTransitIndex === null || draggedTransitIndex === index) return;

    const newOffices = [...transitOffices];
    const draggedItem = newOffices[draggedTransitIndex];
    newOffices.splice(draggedTransitIndex, 1);
    newOffices.splice(index, 0, draggedItem);

    onTransitOfficesChange(newOffices);
    setDraggedTransitIndex(index);
  };

  const handleTransitDragEnd = () => {
    setDraggedTransitIndex(null);
  };

  const displayText = selectedRouteName
    ? `${selectedRouteName} (${customRouteCountries.join(' → ')})`
    : customRouteCountries.length > 0
    ? customRouteCountries.join(' → ')
    : 'Keine Route konfiguriert';

  return (
    <>
      {/* Route Selector Field */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Route</label>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={displayText}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Konfigurieren
          </button>
        </div>
      </div>

      {/* Route Configuration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Route & Transit konfigurieren</h3>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Saved Routes */}
              <div>
                <h4 className="font-bold mb-3">Gespeicherte Routen</h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableRoutes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleRouteSelect(route)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedRouteId === route.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="font-bold text-lg">{route.name}</div>
                      <div className="text-sm text-gray-600">{route.countries.join(' → ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Route Countries (Drag & Drop) */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold">Länder auf der Route (Drag & Drop)</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomCountry();
                        }
                      }}
                      className="px-3 py-1 border rounded text-sm w-20 focus:ring-2 focus:ring-blue-500"
                      placeholder="DE"
                    />
                    <button
                      type="button"
                      onClick={addCustomCountry}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      + Land
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customRouteCountries.map((country, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleCountryDragStart(index)}
                      onDragOver={(e) => handleCountryDragOver(e, index)}
                      onDragEnd={handleCountryDragEnd}
                      className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg cursor-move hover:bg-blue-200 transition-colors"
                    >
                      <svg
                        className="h-4 w-4 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                      <span className="font-bold">{country}</span>
                      <button
                        type="button"
                        onClick={() => removeCountry(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {customRouteCountries.length === 0 && (
                    <p className="text-gray-500 text-sm italic">Keine Länder hinzugefügt</p>
                  )}
                </div>
              </div>

              {/* Transit Offices (Drag & Drop + Search) */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold">Durchgangszollstellen (Drag & Drop)</h4>
                  <div className="flex gap-2 relative flex-1 max-w-md ml-4">
                    <input
                      type="text"
                      value={transitSearch}
                      onChange={(e) => setTransitSearch(e.target.value)}
                      className="flex-1 px-3 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Mindestens 2 Zeichen..."
                    />
                    {/* Loading Indicator */}
                    {loadingTransit && transitSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg p-4 z-10">
                        <p className="text-sm text-gray-500 text-center">Suche...</p>
                      </div>
                    )}
                    {/* Results Dropdown */}
                    {!loadingTransit && transitSearch.length >= 2 && transitOfficesResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                        {transitOfficesResults.map((office) => (
                          <div
                            key={office.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              addTransitOffice(office);
                            }}
                            className="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium">
                              {office.code} - {transliterate(office.name)}
                            </div>
                            <div className="text-xs text-gray-500">{office.countryCode}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* No results */}
                    {!loadingTransit && transitSearch.length >= 2 && transitOfficesResults.length === 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg p-4 z-10">
                        <p className="text-sm text-gray-500 text-center">Keine Zollstellen gefunden</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {transitOffices.map((office, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleTransitDragStart(index)}
                      onDragOver={(e) => handleTransitDragOver(e, index)}
                      onDragEnd={handleTransitDragEnd}
                      className="flex items-center justify-between bg-purple-100 px-4 py-3 rounded-lg cursor-move hover:bg-purple-200 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8h16M4 16h16"
                          />
                        </svg>
                        <span className="font-mono font-bold">{office}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTransitOffice(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {transitOffices.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-4">
                      Keine Durchgangszollstellen
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded hover:bg-orange-700 font-medium"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
