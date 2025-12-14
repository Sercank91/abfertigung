export function getSubdomainFromHost(host: string | null): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase(); // remove :port

  // localhost without subdomain
  if (hostname === "localhost") return null;

  // verag.localhost
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");
    return sub || null;
  }

  // verag.abfertigung.io (production later)
  const rootDomain = "abfertigung.io";
  if (hostname === rootDomain) return null;
  if (hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.slice(0, -(`.${rootDomain}`.length));
    return sub || null;
  }

  // fallback: take first label if multi-label host
  // e.g. "sub.domain.com" -> "sub"
  const parts = hostname.split(".");
  // For localhost (parts=1) or domain.com (parts=2), we return null via above checks or here?
  // If we have "something.unknown.com", parts=3.
  return parts.length >= 3 ? parts[0] : null;
}

