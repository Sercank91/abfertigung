'use client';

import { useState } from 'react';

/**
 * AuthorizationSelector Component
 *
 * Wiederverwendbare Komponente für die Auswahl von Bewilligungen
 * (für vereinfachtes Verfahren) - unterstützt Mehrfachauswahl
 */

interface Authorization {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface AuthorizationSelectorProps {
  // Ausgewählte Bewilligungen (IDs)
  selectedIds: string[];

  // Callback wenn Bewilligungen ausgewählt werden
  onSelectionChange: (ids: string[]) => void;

  // Liste aller verfügbaren Bewilligungen
  authorizations: Authorization[];

  // Ist vereinfachtes Verfahren aktiv?
  isEnabled: boolean;
}

export default function AuthorizationSelector({
  selectedIds,
  onSelectionChange,
  authorizations,
  isEnabled,
}: AuthorizationSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedAuthorizations = authorizations.filter((auth) =>
    selectedIds.includes(auth.id)
  );

  const displayText =
    selectedAuthorizations.length > 0
      ? selectedAuthorizations.map((a) => a.code).join(', ')
      : 'Keine Bewilligung ausgewählt';

  const handleToggle = (authId: string) => {
    if (selectedIds.includes(authId)) {
      onSelectionChange(selectedIds.filter((id) => id !== authId));
    } else {
      onSelectionChange([...selectedIds, authId]);
    }
  };

  const handleDone = () => {
    setIsModalOpen(false);
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* Authorization Selector Field */}
      <div className="flex items-center gap-4">
        <label className="w-48 text-sm font-medium text-gray-700">Bewilligung*</label>
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
            Wählen
          </button>
        </div>
      </div>

      {/* Authorization Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Bewilligungen auswählen</h3>
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
              {authorizations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Keine Bewilligungen verfügbar
                </p>
              ) : (
                <div className="space-y-3">
                  {authorizations.map((auth) => {
                    const isSelected = selectedIds.includes(auth.id);
                    return (
                      <button
                        key={auth.id}
                        type="button"
                        onClick={() => handleToggle(auth.id)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-1">
                            <div
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                isSelected
                                  ? 'bg-orange-600 border-orange-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-bold">{auth.name}</div>
                              <span className="text-sm text-gray-500 font-mono">{auth.code}</span>
                            </div>
                            {auth.description && (
                              <div className="text-sm text-gray-600 mt-1">{auth.description}</div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {selectedIds.length} {selectedIds.length === 1 ? 'Bewilligung' : 'Bewilligungen'}{' '}
                  ausgewählt
                </p>
                <button
                  type="button"
                  onClick={handleDone}
                  className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
