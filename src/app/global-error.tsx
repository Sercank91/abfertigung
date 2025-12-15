'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          {/* Header */}
          <header style={{ 
            backgroundColor: '#393939',
            height: '55px',
            width: '100%',
            padding: '0 2rem',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <h1 style={{ 
              color: 'white', 
              fontSize: '1.875rem', 
              fontWeight: '300',
              letterSpacing: '0.05em',
              margin: 0
            }}>MAS Project</h1>
          </header>

          {/* Subheader */}
          <div style={{ 
            backgroundColor: '#f2f2f2', 
            width: '100%', 
            padding: '1rem 2rem',
            borderBottom: '1px solid #c6c6c6'
          }}>
            <h2 style={{ 
              color: '#1f2937', 
              fontSize: '1.25rem', 
              fontWeight: '400',
              margin: 0
            }}>
              Kritischer Fehler
            </h2>
          </div>

          {/* Content */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#111827',
                marginBottom: '1rem'
              }}>
                Ein kritischer Fehler ist aufgetreten
              </h2>
              <p style={{ 
                color: '#4b5563', 
                marginBottom: '1.5rem'
              }}>
                Die Anwendung konnte nicht geladen werden. Bitte laden Sie die Seite neu.
              </p>
              {error.digest && (
                <p style={{ 
                  color: '#9ca3af', 
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  Fehler-ID: {error.digest}
                </p>
              )}
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  color: 'white',
                  borderRadius: '0.25rem',
                  fontWeight: '500',
                  fontSize: '1rem',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundImage: 'linear-gradient(#0090e5, #0076bc 60%, #0069a8)',
                }}
              >
                Seite neu laden
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ 
            backgroundColor: '#f2f2f2',
            borderTop: '1px solid #c6c6c6',
            width: '100%',
            padding: '1rem 2rem',
            textAlign: 'right'
          }}>
            <p style={{ 
              color: '#4b5563', 
              fontSize: '0.75rem',
              margin: 0
            }}>
              1.0.5v © 2025 MAS Project für Speditionen
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}

