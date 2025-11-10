'use client';

/**
 * PositionenTab Component
 *
 * Tab für OCR-Upload und Positionsverwaltung
 * Aktuell Platzhalter - wird in Phase 2 (OCR) implementiert
 */

interface PositionenTabProps {
  onNext: () => void;
}

export default function PositionenTab({ onNext }: PositionenTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">OCR-Upload & Positionen</h3>
        <p className="text-gray-600 mb-6">
          Dieser Bereich wird für OCR-Upload entwickelt.
          <br />
          Hier können Sie Dokumente hochladen und Positionen verwalten.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span>Dokumenten-Upload</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>OCR-Erkennung</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span>Positionsverwaltung</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Weiter zur Zusammenfassung →
        </button>
      </div>
    </div>
  );
}
