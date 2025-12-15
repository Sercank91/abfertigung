'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Header */}
      <header 
        style={{ 
          backgroundColor: '#393939',
          height: '55px',
          minHeight: '56px',
          maxHeight: '56px'
        }} 
        className="w-full px-8 shadow-md flex items-center"
      >
        <h1 className="text-white text-3xl font-light tracking-wide">MAS Project</h1>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Fehler
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            Ein unerwarteter Fehler ist aufgetreten
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Etwas ist schiefgelaufen
          </h2>
          <p className="text-gray-600 mb-6">
            Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.
          </p>
          {error.digest && (
            <p className="text-gray-400 text-sm mb-4">
              Fehler-ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 text-white rounded font-medium text-base transition-all"
            style={{
              backgroundImage: 'linear-gradient(#0090e5, #0076bc 60%, #0069a8)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundImage = 'linear-gradient(#0070b2, #005689 60%, #004975)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundImage = 'linear-gradient(#0090e5, #0076bc 60%, #0069a8)';
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer 
        style={{ 
          backgroundColor: '#f2f2f2',
          borderTop: '1px solid #c6c6c6'
        }} 
        className="w-full py-4 px-8 text-right"
      >
        <p className="text-gray-600 text-xs">
          1.0.5v © 2025 MAS Project für Speditionen
        </p>
      </footer>
    </div>
  );
}

