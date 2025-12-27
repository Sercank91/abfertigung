/**
 * 🔒 SECURITY: Zentrale Tenant-Validierung mit Host Allowlist
 * 
 * Diese Funktion ist die EINZIGE Quelle für Tenant-Bestimmung.
 * Sie verhindert Host Header Spoofing durch strikte Allowlist-Validierung.
 * 
 * WICHTIG: Nutzt NIEMALS x-forwarded-host (kann vom Angreifer manipuliert werden)
 * 
 * 🧪 DEV-ONLY FALLBACK:
 * In lokaler Entwicklung gibt Next.js manchmal nur "localhost" als hostname zurück,
 * auch wenn die URL "verag.localhost:3000" ist. Als Fallback wird dann der Host-Header
 * verwendet, aber NUR wenn:
 * - NODE_ENV !== 'production'
 * - hostname === 'localhost' (ohne Subdomain)
 * - hostHeader endet mit '.localhost'
 * 
 * In Production wird hostHeader IMMER ignoriert - nur request.nextUrl.hostname zählt!
 * 
 * @param hostname - Der Hostname (MUSS von request.nextUrl.hostname kommen)
 * @param hostHeader - Optional: Host-Header für DEV-ONLY localhost-Fallback
 * @returns Validierungsergebnis mit Tenant und Sicherheitsstatus
 */
export interface TenantValidationResult {
  tenant: string | null;
  isValidHost: boolean;
  isRootDomain?: boolean;
  isAdminMode?: boolean;
  reason?: string;
}

/**
 * 🔒 Parse CSV ENV Variable
 */
function parseCsvEnv(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue.split(',').map(h => h.trim().toLowerCase()).filter(h => h);
}

export function parseTenantFromHostname(hostname: string, hostHeader?: string | null): TenantValidationResult {
  if (!hostname) {
    return { tenant: null, isValidHost: false, reason: 'Hostname fehlt' };
  }

  let normalizedHost = hostname.toLowerCase();

  // 🧪 DEV-ONLY: Localhost-Subdomain-Fallback
  // Problem: In lokaler Entwicklung gibt request.nextUrl.hostname manchmal nur "localhost" zurück,
  // auch wenn die URL "verag.localhost:3000" ist. Der Host-Header enthält aber die korrekte Subdomain.
  // Lösung: Wenn hostname nur "localhost" ist, aber Host-Header eine Subdomain enthält, verwende Host-Header.
  // WICHTIG: Dies funktioniert NUR für *.localhost UND NUR in DEV!
  if (process.env.NODE_ENV !== 'production' && normalizedHost === 'localhost' && hostHeader) {
    const hostWithoutPort = hostHeader.toLowerCase().split(':')[0];
    if (hostWithoutPort.endsWith('.localhost') && hostWithoutPort !== 'localhost') {
      console.log('[DEV] Localhost-Subdomain-Fallback aktiviert:', {
        'nextUrl.hostname': normalizedHost,
        'host header': hostHeader,
        'using': hostWithoutPort
      });
      normalizedHost = hostWithoutPort;
    }
  }

  // 🧪 DEV-ONLY: Debug-Logging für localhost-Entwicklung
  if (process.env.NODE_ENV !== 'production' && normalizedHost.includes('localhost')) {
    console.log('[DEV] parseTenantFromHostname:', { 
      original: hostname, 
      normalized: normalizedHost,
      hostHeader: hostHeader
    });
  }

  // 🔒 ALLOWLIST: Nur diese Hosts sind erlaubt
  const ALLOWED_HOSTS = [
    // Lokale Entwicklung
    'localhost',
    '127.0.0.1',
    // Production Main Domain
    'abfertigung.io',
    'www.abfertigung.io',
  ];

  // 🔒 SECURITY: Cloud Run Hosts nur wenn explizit per ENV erlaubt
  // Verhindert, dass beliebige *.run.app Domains als gültig durchgehen
  const cloudRunHost = process.env.CLOUD_RUN_HOSTNAME;
  if (cloudRunHost) {
    ALLOWED_HOSTS.push(cloudRunHost.toLowerCase());
  }

  // Optional: Zusätzliche exakte Hosts aus ENV (comma-separated)
  const additionalExactHosts = parseCsvEnv(process.env.ALLOWED_EXACT_HOSTS);
  ALLOWED_HOSTS.push(...additionalExactHosts);

  // Optional: Base Domains aus ENV (comma-separated) - erlaubt auch Subdomains
  const baseDomains = parseCsvEnv(process.env.ALLOWED_BASE_DOMAINS);

  const ALLOWED_PATTERNS = [
    // Lokale Entwicklung mit Subdomains
    /^[a-z0-9-]+\.localhost$/,
    // Production Subdomains
    /^[a-z0-9-]+\.abfertigung\.io$/,
    // ❌ ENTFERNT: Generisches *.run.app Pattern (SECURITY RISK)
    // Cloud Run Hosts müssen jetzt explizit über ENV erlaubt werden
  ];

  // 0. Prüfe Admin-Mode (admin.localhost oder admin.abfertigung.io)
  if (normalizedHost === 'admin.localhost' || normalizedHost === 'admin.abfertigung.io') {
    return { tenant: null, isValidHost: true, isRootDomain: false, isAdminMode: true };
  }

  // 1. Prüfe exakte Matches (Main Domains ohne Tenant)
  if (ALLOWED_HOSTS.includes(normalizedHost)) {
    return { tenant: null, isValidHost: true, isRootDomain: true, isAdminMode: false };
  }

  // 2. Prüfe Pattern Matches (Subdomain = Tenant)
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(normalizedHost)) {
      // Extrahiere Subdomain
      const parts = normalizedHost.split('.');
      const subdomain = parts[0];
      
      // www ist kein Tenant
      if (subdomain === 'www') {
        return { tenant: null, isValidHost: true, isRootDomain: true, isAdminMode: false };
      }

      // admin ist Admin-Mode (sollte bereits oben abgefangen sein, aber Sicherheit)
      if (subdomain === 'admin') {
        return { tenant: null, isValidHost: true, isRootDomain: false, isAdminMode: true };
      }

      return { tenant: subdomain, isValidHost: true, isRootDomain: false, isAdminMode: false };
    }
  }

  // 3. Prüfe zusätzliche Base Domains aus ENV
  for (const baseDomain of baseDomains) {
    if (normalizedHost === baseDomain) {
      // Exakte Base Domain => Root
      return { tenant: null, isValidHost: true, isRootDomain: true, isAdminMode: false };
    }
    if (normalizedHost.endsWith('.' + baseDomain)) {
      // Subdomain davon => Tenant
      const parts = normalizedHost.split('.');
      const subdomain = parts.slice(0, parts.length - baseDomain.split('.').length).join('.');
      if (subdomain === 'admin') {
        return { tenant: null, isValidHost: true, isRootDomain: false, isAdminMode: true };
      }
      if (subdomain && subdomain !== 'www') {
        return { tenant: subdomain, isValidHost: true, isRootDomain: false, isAdminMode: false };
      }
      return { tenant: null, isValidHost: true, isRootDomain: true, isAdminMode: false };
    }
  }

  // 4. Host nicht in Allowlist → BLOCKIEREN
  // 🔒 SECURITY: In production ohne Allowlist => fail-closed
  if (process.env.NODE_ENV === 'production' && ALLOWED_HOSTS.length <= 4 && baseDomains.length === 0) {
    return {
      tenant: null,
      isValidHost: false,
      reason: `Production: Keine Allowlist konfiguriert (Host: ${hostname})`
    };
  }

  return { 
    tenant: null, 
    isValidHost: false, 
    reason: `Host '${hostname}' nicht in Allowlist` 
  };
}

/**
 * 🔒 SECURITY: Resolve Tenant from Full Request URL
 * 
 * Dies ist die zentrale Funktion für Host-Validierung.
 * Nutzt NUR die URL (nicht Headers!).
 * 
 * @param url - Vollständige Request URL (request.url oder request.nextUrl.toString())
 * @returns Validierungsergebnis mit Hostname und Tenant
 */
export function resolveTenantFromRequestUrl(url: string): TenantValidationResult & { hostname: string } {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const result = parseTenantFromHostname(hostname);
    return {
      ...result,
      hostname
    };
  } catch (error) {
    return {
      hostname: '',
      tenant: null,
      isValidHost: false,
      reason: 'Ungültige URL'
    };
  }
}

/**
 * @deprecated Verwende stattdessen parseTenantFromHostname() für sichere Tenant-Bestimmung
 * Diese Funktion bleibt nur für Abwärtskompatibilität erhalten.
 */
export function getSubdomainFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  // Für diese deprecated Funktion übergeben wir den Host auch als hostHeader für DEV-Fallback
  const result = parseTenantFromHostname(hostname, host);
  return result.isValidHost ? result.tenant : null;
}

/**
 * 🧪 TESTFÄLLE für parseTenantFromHostname()
 * 
 * Erwartete Ergebnisse:
 * 
 * ✅ Lokale Entwicklung:
 *    - localhost                 => { tenant: null, isValidHost: true }
 *    - 127.0.0.1                 => { tenant: null, isValidHost: true }
 *    - verag.localhost           => { tenant: 'verag', isValidHost: true }
 *    - test-firma.localhost      => { tenant: 'test-firma', isValidHost: true }
 * 
 * ✅ Production:
 *    - abfertigung.io            => { tenant: null, isValidHost: true }
 *    - www.abfertigung.io        => { tenant: null, isValidHost: true }
 *    - verag.abfertigung.io      => { tenant: 'verag', isValidHost: true }
 *    - test-firma.abfertigung.io => { tenant: 'test-firma', isValidHost: true }
 * 
 * ✅ Cloud Run (nur wenn ENV gesetzt):
 *    - <CLOUD_RUN_HOSTNAME>      => { tenant: null, isValidHost: true }
 *    (z.B. abfertigung-830368640606.europe-west1.run.app)
 * 
 * ❌ Ungültige Hosts (BLOCKIERT):
 *    - evil.run.app              => { tenant: null, isValidHost: false, reason: '...' }
 *    - attacker.com              => { tenant: null, isValidHost: false, reason: '...' }
 *    - verag.evil.com            => { tenant: null, isValidHost: false, reason: '...' }
 *    - random-service.run.app    => { tenant: null, isValidHost: false, reason: '...' }
 */