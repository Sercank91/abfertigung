# 🔍 DEBUG: Login Problem auf localhost

## Problem
Login auf `http://verag.localhost:3000` funktioniert nicht.
Fehlermeldung: "Login nur über Firmen-Subdomain möglich"

## Erwartetes Verhalten
- URL: `http://verag.localhost:3000`
- Hostname: `verag.localhost`
- Extrahierter Tenant: `verag`
- Datenbank-Lookup: `SELECT ... WHERE domain = 'verag'` → sollte Verag Tenant finden

## Debug-Schritte

### 1. Server starten
```bash
npm run dev
```

### 2. Hostname-Erkennung testen (WICHTIG!)
Öffne im Browser: `http://verag.localhost:3000/api/debug-host`

Erwartete Ausgabe:
```json
{
  "request.nextUrl.hostname": "verag.localhost",
  "request.headers.host": "verag.localhost:3000",
  "request.headers.x-forwarded-host": null,
  "request.nextUrl.href": "http://verag.localhost:3000/api/debug-host",
  "request.nextUrl.origin": "http://verag.localhost:3000",
  "NODE_ENV": "development"
}
```

**WICHTIG:** Wenn `request.nextUrl.hostname` nur `localhost` (ohne `verag.`) zeigt,
dann haben wir das Problem identifiziert!

### 3. Browser öffnen
Navigiere zu: `http://verag.localhost:3000`

### 3. Login versuchen
- Username: `admin`
- Password: `admin123`

### 4. Console-Logs prüfen
Die folgenden Debug-Logs sollten erscheinen:

**Middleware:**
```
[DEV] Middleware: {
  path: '/',
  'nextUrl.hostname': 'verag.localhost',
  'headers.host': 'verag.localhost:3000'
}
```

**Tenant Parsing:**
```
[DEV] parseTenantFromHostname: {
  original: 'verag.localhost',
  normalized: 'verag.localhost'
}
```

**Login Request:**
```
[DEV] Login Request: {
  'nextUrl.hostname': 'verag.localhost',
  'headers.host': 'verag.localhost:3000',
  'nextUrl.href': 'http://verag.localhost:3000/api/login'
}
```

### 5. Fehlerfall-Logs
Falls der Login fehlschlägt, sollten diese Logs erscheinen:

**Host validation failed:**
```
[DEV] Host validation failed: {
  hostname: '...',
  isValidHost: false,
  reason: '...',
  subdomain: null
}
```

**No subdomain extracted:**
```
[DEV] No subdomain extracted: {
  hostname: '...',
  isValidHost: true,
  subdomain: null
}
```

**Tenant not found in database:**
```
[DEV] Tenant not found in database: {
  subdomain: '...',
  hostname: '...'
}
```

## Mögliche Ursachen

### A) Hostname wird falsch erkannt
- `request.nextUrl.hostname` gibt nicht `verag.localhost` zurück
- Möglicherweise nur `localhost` ohne Subdomain

### B) Regex matcht nicht
- Pattern `/^[a-z0-9-]+\.localhost$/` funktioniert nicht wie erwartet
- Subdomain wird nicht korrekt extrahiert

### C) Datenbank-Problem
- Tenant mit `domain = 'verag'` existiert nicht
- Seed wurde nicht ausgeführt

## Nächste Schritte
1. Debug-Logs sammeln
2. Root Cause identifizieren
3. Fix implementieren (DEV-ONLY, Production bleibt unverändert)

