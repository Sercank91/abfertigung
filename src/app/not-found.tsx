import Link from 'next/link';

export default function NotFound() {
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
        <h1 className="text-white text-3xl font-light tracking-wide">ATILLATEC</h1>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: '#f2f2f2' }} className="w-full py-4 px-8 border-b border-gray-300">
        <div className="flex items-end gap-3">
          <h2 className="text-gray-800 text-xl font-normal leading-none">
            Seite nicht gefunden
          </h2>
          <span className="text-gray-600 text-sm leading-none mb-0.5">
            404 Fehler
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Seite nicht gefunden
          </h2>
          <p className="text-gray-600 mb-6">
            Die angeforderte Seite existiert nicht oder wurde verschoben.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 text-white rounded font-medium text-base transition-all"
            style={{
              backgroundImage: 'linear-gradient(#0090e5, #0076bc 60%, #0069a8)',
            }}
          >
            Zur Startseite
          </Link>
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
          1.0.5v © 2026 Atilla Spedition GmbH Coded with Love (Sercan K.)
        </p>
      </footer>
    </div>
  );
}

