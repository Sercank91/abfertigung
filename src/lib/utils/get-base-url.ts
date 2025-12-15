import { headers } from 'next/headers';

/**
 * Ermittelt die Base-URL für Server-Side API-Calls.
 * Verwendet die Request-Headers, um den korrekten Host zu ermitteln.
 * Funktioniert sowohl auf localhost als auch in Production (Cloudflare/Cloud Run).
 */
export function getBaseUrl(): string {
  // Für Build-Zeit oder wenn keine Headers verfügbar sind
  if (typeof window !== 'undefined') {
    // Client-Side: verwende window.location
    return window.location.origin;
  }

  try {
    const headersList = headers();
    
    // Debug: Log alle relevanten Headers (nur in Development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[getBaseUrl] Headers:', {
        host: headersList.get('host'),
        'x-forwarded-host': headersList.get('x-forwarded-host'),
        'x-forwarded-proto': headersList.get('x-forwarded-proto'),
      });
    }
    
    // Cloudflare/Proxy Support: X-Forwarded-Host und X-Forwarded-Proto bevorzugen
    const forwardedHost = headersList.get('x-forwarded-host');
    const forwardedProto = headersList.get('x-forwarded-proto');
    const host = headersList.get('host');
    
    // Bestimme den Host (Cloudflare setzt x-forwarded-host)
    const actualHost = forwardedHost?.split(',')[0]?.trim() || host;
    
    if (!actualHost) {
      console.warn('[getBaseUrl] Kein Host gefunden, verwende Fallback');
      return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }
    
    // Bestimme das Protokoll
    let protocol = 'https';
    
    // Für localhost immer http verwenden
    if (actualHost.includes('localhost') || actualHost.includes('127.0.0.1')) {
      protocol = 'http';
    } else if (forwardedProto) {
      // Verwende x-forwarded-proto wenn verfügbar
      protocol = forwardedProto.split(',')[0]?.trim() || 'https';
    }
    
    const baseUrl = `${protocol}://${actualHost}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[getBaseUrl] Ermittelte URL:', baseUrl);
    }
    
    return baseUrl;
  } catch (error) {
    // Fallback wenn headers() nicht verfügbar ist (z.B. während Build)
    console.warn('[getBaseUrl] Fehler beim Ermitteln der URL:', error);
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
}
