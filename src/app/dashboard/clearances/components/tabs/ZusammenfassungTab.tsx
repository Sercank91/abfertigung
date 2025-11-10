'use client';

/**
 * ZusammenfassungTab Component
 *
 * Tab für Zusammenfassung und finale Überprüfung
 * Aktuell Platzhalter - wird später implementiert
 */

interface ZusammenfassungTabProps {
  anmNr?: string;
  lrn?: string;
}

export default function ZusammenfassungTab({ anmNr, lrn }: ZusammenfassungTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Zusammenfassung</h3>
        <p className="text-gray-600 mb-4">
          Hier wird eine vollständige Übersicht aller eingegebenen Daten angezeigt.
        </p>

        {anmNr && (
          <div className="bg-white rounded-lg p-4 mb-4 inline-block">
            <div className="text-sm text-gray-600 mb-1">Anmeldenummer</div>
            <div className="text-2xl font-bold text-blue-600">{anmNr}</div>
          </div>
        )}

        {lrn && (
          <div className="bg-white rounded-lg p-4 inline-block">
            <div className="text-sm text-gray-600 mb-1">LRN</div>
            <div className="text-lg font-mono text-gray-900">{lrn}</div>
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded p-3">
            <div className="text-gray-600 mb-1">Status</div>
            <div className="font-medium text-yellow-600">In Bearbeitung</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="text-gray-600 mb-1">Anmeldung</div>
            <div className="font-medium text-green-600">✓ Vollständig</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="text-gray-600 mb-1">Positionen</div>
            <div className="font-medium text-gray-400">Ausstehend</div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Nächste Schritte</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Positionen über OCR hinzufügen</li>
              <li>• Alle Daten überprüfen</li>
              <li>• Clearance einreichen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
