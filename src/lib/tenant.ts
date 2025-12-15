export function getSubdomainFromHost(host: string | null): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase(); // remove :port

  // 1. Exakte Matches für Main Domains (kein Tenant)
  if (
    hostname === "localhost" ||
    hostname === "www.localhost" ||
    hostname === "abfertigung.io" ||
    hostname === "www.abfertigung.io"
  ) {
    return null;
  }

  // 2. Cloud Run Domains ignorieren (kein Tenant)
  if (hostname.endsWith(".run.app")) {
    return null;
  }

  // 3. Localhost Subdomains
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");
    if (sub === "www") return null;
    return sub || null;
  }

  // 4. Production Subdomains (*.abfertigung.io)
  const rootDomain = "abfertigung.io";
  if (hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.slice(0, -(`.${rootDomain}`.length));
    if (sub === "www") return null;
    return sub || null;
  }

  // 5. Fallback: Wenn wir hier sind, ist es eine unbekannte Domain.
  // Wir nehmen an, der erste Teil ist die Subdomain, außer es ist www.
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    if (parts[0] === "www") return null;
    return parts[0];
  }

  return null;
}


