'use client';

import { useState } from 'react';

/**
 * GoodsLocationSelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl eines Warenorts
 * (für vereinfachtes Verfahren)
 */

interface GoodsLocation {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

interface GoodsLocationSelectorProps {
  // Ausgewählter Warenort
  goodsLocationId?: string;
  goodsLocationName?: string;

  // Callback wenn ein Warenort ausgewählt wird
  onSelect: (location: GoodsLocation) => void;

  // Liste aller verfügbaren Warenorte
  goodsLocations: GoodsLocation[];

  // Ist vereinfachtes Verfahren aktiv?
  isEnabled: boolean;
}

export default function GoodsLocationSelector({
  goodsLocationId,
  goodsLocationName,
  onSelect,
  goodsLocations,
  isEnabled,
}: GoodsLocationSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (location: GoodsLocation) => {
    onSelect(location);
    setIsModalOpen(false);
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* Goods Location Selector Field */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Warenort*</label>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={goodsLocationName || ''}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
            placeholder="Kein Warenort ausgewählt"
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {goodsLocationId ? 'Ändern' : 'Wählen'}
          </button>
        </div>
      </div>

      {/* Goods Location Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Warenort auswählen</h3>
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
            <div className="p-6 max-h-96 overflow-y-auto">
              {goodsLocations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Keine Warenorte verfügbar
                </p>
              ) : (
                <div className="space-y-3">
                  {goodsLocations.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleSelect(location)}
                      className="w-full p-4 border-2 rounded-lg text-left hover:border-purple-500 hover:bg-purple-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{location.name}</div>
                        {location.code && (
                          <span className="text-sm text-gray-500 font-mono">{location.code}</span>
                        )}
                      </div>
                      {location.description && (
                        <div className="text-sm text-gray-600 mt-1">{location.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
