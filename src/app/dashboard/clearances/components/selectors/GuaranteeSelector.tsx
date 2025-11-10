'use client';

import { useState } from 'react';

/**
 * GuaranteeSelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl einer Bürgschaft
 * mit Modal zur Auswahl aus verfügbaren Bürgschaften
 */

interface Guarantee {
  id: string;
  name: string;
  description?: string;
}

interface GuaranteeSelectorProps {
  // Ausgewählte Guarantee
  guaranteeId?: string;
  guaranteeName?: string;

  // Callback wenn eine Guarantee ausgewählt wird
  onSelect: (guarantee: Guarantee) => void;

  // Liste aller verfügbaren Guarantees
  availableGuarantees: Guarantee[];

  // Ist eine Company ausgewählt?
  hasCompanySelected: boolean;
}

export default function GuaranteeSelector({
  guaranteeId,
  guaranteeName,
  onSelect,
  availableGuarantees,
  hasCompanySelected,
}: GuaranteeSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (guarantee: Guarantee) => {
    onSelect(guarantee);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Guarantee Selector Field */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Bürgschaft*</label>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={guaranteeName || ''}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50"
            placeholder={
              hasCompanySelected
                ? 'Keine Bürgschaft ausgewählt'
                : 'Bitte zuerst Firma wählen'
            }
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            disabled={!hasCompanySelected}
            className={`px-4 py-2 rounded ${
              hasCompanySelected
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {guaranteeId ? 'Ändern' : 'Wählen'}
          </button>
        </div>
      </div>

      {/* Guarantee Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Bürgschaft auswählen</h3>
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
              {availableGuarantees.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {hasCompanySelected
                    ? 'Keine Bürgschaften verfügbar'
                    : 'Bitte zuerst Firma wählen'}
                </p>
              ) : (
                <div className="space-y-3">
                  {availableGuarantees.map((guarantee) => (
                    <button
                      key={guarantee.id}
                      type="button"
                      onClick={() => handleSelect(guarantee)}
                      className="w-full p-4 border-2 rounded-lg text-left hover:border-green-500 hover:bg-green-50 transition-all"
                    >
                      <div className="font-bold">{guarantee.name}</div>
                      {guarantee.description && (
                        <div className="text-sm text-gray-600 mt-1">{guarantee.description}</div>
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
