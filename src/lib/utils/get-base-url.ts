import { headers } from 'next/headers';

/**
 * Ermittelt die Base-URL für Server-Side API-Calls.
 * 
 * ⚠️ WICHTIG: Diese Funktion kann NICHT für Security-relevante Validierung verwendet werden,
 * da sie aus Next.js Server Components aufgerufen wird, wo kein Request-Objekt verfügbar ist.
 * Sie dient nur als Convenience für Client-Side Redirects.
 * 
 * Für Security: Nutze resolveTenantFromRequestUrl(request.url) in API routes!
 */
export async function getBaseUrl(): Promise<string> {
  // Für Build-Zeit oder wenn keine Headers verfügbar sind
  if (typeof window !== 'undefined') {
    // Client-Side: verwende window.location
    return window.location.origin;
  }

  try {
    const headersList = await headers();
    
    // 🔒 SECURITY NOTE: Dies ist NUR für convenience, NICHT für Security!
    // In API routes: Nutze resolveTenantFromRequestUrl(request.url)
    const host = headersList.get('host');
    
    if (!host) {
      console.warn('[getBaseUrl] Kein Host gefunden, verwende Fallback');
      return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }
    
    // Bestimme das Protokoll
    let protocol = 'https';
    
    // Für localhost immer http verwenden
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      protocol = 'http';
    }
    
    const baseUrl = `${protocol}://${host}`;
    
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
