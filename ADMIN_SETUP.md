# Super-Admin Dashboard Setup

## Übersicht

Das Super-Admin Dashboard ist auf einer separaten Subdomain verfügbar:

- **Produktion**: `admin.abfertigung.io`
- **Lokal**: `admin.localhost:3000`

Das Admin-Portal ist **kein Tenant** und läuft komplett getrennt von der Tenant-Logik. Super-Admins haben Vollzugriff auf alle Tenants, deren Kunden/Firmen und alle Verwaltungsbereiche.

## Lokale Einrichtung (Windows)

### 1. Hosts-Eintrag hinzufügen

Öffne die Hosts-Datei als Administrator:

```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

Füge folgende Zeile hinzu:

```
127.0.0.1    admin.localhost
```

Speichern und Notepad schließen.

### 2. Datenbank-Migration

Die Datenbank wurde bereits mit den neuen Tabellen aktualisiert:

- `SuperAdmin` - Super-Admin User (getrennt von normalen Usern)
- `UserSession` - Presence/Online Tracking
- `Tenant.status` - Status-Feld für Tenants (active, inactive, deleted)

### 3. Super-Admin erstellen

Führe das Bootstrap-Script aus:

```powershell
npx tsx scripts/bootstrap-superadmin.ts
```

**Standard-Login-Daten:**
- URL: `http://admin.localhost:3000`
- Username: `admin`
- Password: `Admin123!`

⚠️ **WICHTIG**: Ändere das Passwort nach dem ersten Login!

### 4. Eigene Login-Daten verwenden (Optional)

Du kannst eigene Login-Daten über Umgebungsvariablen setzen:

```powershell
$env:SUPER_ADMIN_USERNAME="meinadmin"
$env:SUPER_ADMIN_EMAIL="meinadmin@example.com"
$env:SUPER_ADMIN_PASSWORD="MeinSicheresPasswort123!"
$env:SUPER_ADMIN_FIRSTNAME="Max"
$env:SUPER_ADMIN_LASTNAME="Mustermann"

npx tsx scripts/bootstrap-superadmin.ts
```

## Funktionen

### Phase 1: Admin Host-Routing + Login ✅

- Separate Authentifizierung für Super-Admins
- Admin-Token (Cookie: `admin-token`) getrennt von Tenant-Token
- Middleware erkennt Admin-Mode automatisch
- Geschütztes Admin-Portal

### Phase 2: Tenant-Management ✅

**URL**: `http://admin.localhost:3000/admin/tenants`

- Liste aller Tenants (Speditionen)
- Neuen Tenant erstellen (Name + Subdomain)
- Tenant aktivieren/deaktivieren
- Tenant löschen (Soft-Delete: Status = 'deleted')
- Statistiken pro Tenant (User, Firmen, Abfertigungen)

**Subdomain erstellen**:
- Subdomain wird nur in der DB angelegt
- DNS/Wildcard ist bereits konfiguriert (Cloudflare/Cloud Run)
- Keine automatische DNS-Provisionierung nötig

### Phase 3: Live-Statistiken (Presence Tracking) ✅

**URL**: `http://admin.localhost:3000/admin/live`

- Echtzeit-Übersicht: Welche User sind online
- Pro Tenant: Liste der Online-User
- Aktuelle Seite/Route pro User
- "Online" = lastSeenAt innerhalb der letzten 2 Minuten
- Auto-Refresh alle 10 Sekunden

**Technische Implementierung**:
- Heartbeat API: `POST /api/heartbeat`
- Client sendet alle 60 Sekunden einen Heartbeat
- Heartbeat enthält `currentPath` (aktuelle Route)
- `HeartbeatClient` Component im Dashboard Layout

### Phase 4: Tenant-Daten-Verwaltung ✅

**URL**: `http://admin.localhost:3000/admin/tenant-data/[tenantId]`

- Übersicht pro Tenant (User, Firmen, Abfertigungen, etc.)
- **Firmen/Kunden CRUD**:
  - Liste aller Firmen des Tenants
  - Neue Firma erstellen
  - Firma bearbeiten
  - Firma aktivieren/deaktivieren
  - Firma löschen
- Platzhalter für weitere Module:
  - Bürgschaften
  - Routen
  - Bewilligungen
  - Warenorte

## Lokale Test-Schritte (PowerShell)

### 1. Server starten

```powershell
npm run dev
```

### 2. Admin-Portal öffnen

Browser öffnen: `http://admin.localhost:3000`

Du solltest die Admin-Login-Seite sehen (mit rotem SUPER ADMIN Badge).

### 3. Anmelden

- Username: `admin`
- Password: `Admin123!`

### 4. Dashboard erkunden

Nach erfolgreicher Anmeldung siehst du:

- **Dashboard** (`/admin`): Übersicht mit KPI-Cards
  - Gesamt Tenants
  - Aktive Tenants
  - Gesamt User
  - Inaktive Tenants
  
- **Tenant-Verwaltung** (`/admin/tenants`):
  - Klicke auf "Neuer Tenant"
  - Erstelle einen Test-Tenant (z.B. Name: "Test Spedition", Domain: "test")
  - Der Tenant ist dann unter `http://test.localhost:3000` erreichbar

- **Live-Statistiken** (`/admin/live`):
  - Öffne in einem zweiten Browser-Tab einen Tenant (z.B. `http://verag.localhost:3000`)
  - Melde dich als normaler User an
  - Gehe zurück zum Admin-Portal → Live-Statistiken
  - Du solltest den User als "online" sehen mit aktueller Seite

- **Tenant-Daten** (von Tenant-Liste → "Daten" Button):
  - Zeigt Statistiken des Tenants
  - Liste der Firmen/Kunden
  - Erstelle Test-Firma
  - Bearbeite/Lösche Firma

### 5. Tenant-Portal testen

Öffne einen Tenant: `http://verag.localhost:3000`

Die normale Tenant-Logik sollte **unverändert** funktionieren:
- Login als normaler User
- Dashboard
- Abfertigungen
- Firmen
- etc.

### 6. Abmelden

Klicke auf "Abmelden" im Admin-Portal.

Du wirst zu `/admin/login` weitergeleitet.

## Architektur

### Host-Erkennung

Die Middleware (`src/middleware.ts`) erkennt automatisch:

- `admin.localhost:3000` oder `admin.abfertigung.io` → **Admin-Mode**
- `<tenant>.localhost:3000` oder `<tenant>.abfertigung.io` → **Tenant-Mode**
- `localhost:3000` oder `abfertigung.io` → **Root-Domain** (Landing Page)

### Authentifizierung

**Admin-Mode**:
- Cookie: `admin-token`
- Payload: `{ id, username, email, firstName, lastName, role: 'SUPER_ADMIN', isAdminMode: true }`
- Keine Tenant-Guards

**Tenant-Mode**:
- Cookie: `auth-token`
- Payload: `{ id, username, tenantId, tenantName, tenantSlug, role, ... }`
- Tenant-Guards aktiv

### Datenbank-Schema

**SuperAdmin**:
```prisma
model SuperAdmin {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  firstName String
  lastName  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**UserSession** (Presence Tracking):
```prisma
model UserSession {
  id          String   @id @default(uuid())
  userId      String
  tenantId    String
  currentPath String?
  lastSeenAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(...)
  tenant      Tenant   @relation(...)

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([lastSeenAt])
}
```

**Tenant** (mit Status):
```prisma
model Tenant {
  id     String @id @default(uuid())
  name   String
  domain String @unique
  status String @default("active") // active, inactive, deleted
  // ... relations
}
```

## API Routes

### Admin Auth
- `POST /api/admin/login` - Super-Admin Login
- `POST /api/admin/logout` - Super-Admin Logout
- `GET /api/admin/me` - Aktueller Super-Admin User

### Tenant Management
- `GET /api/admin/tenants` - Liste aller Tenants
- `POST /api/admin/tenants` - Neuen Tenant erstellen
- `GET /api/admin/tenants/[id]` - Einzelnen Tenant abrufen
- `PATCH /api/admin/tenants/[id]` - Tenant aktualisieren (Name, Status)
- `DELETE /api/admin/tenants/[id]` - Tenant löschen (Soft-Delete)

### Live Statistics
- `GET /api/admin/live` - Live-Statistiken (Online-User pro Tenant)

### Tenant Data Management
- `GET /api/admin/tenant-data/[tenantId]/companies` - Firmen eines Tenants
- `POST /api/admin/tenant-data/[tenantId]/companies` - Neue Firma erstellen
- `PATCH /api/admin/tenant-data/[tenantId]/companies/[id]` - Firma aktualisieren
- `DELETE /api/admin/tenant-data/[tenantId]/companies/[id]` - Firma löschen

### Heartbeat (Tenant-User)
- `POST /api/heartbeat` - Heartbeat für Presence Tracking

## UI/UX Design

Das Admin-Portal verwendet das gleiche Design-System wie die Tenant-Portale:

- **Header**: Dunkelgrau (#393939) mit rotem "SUPER ADMIN" Badge
- **Subheader**: Hellgrau (#f2f2f2) mit Seitentitel
- **Buttons**: Rot für Admin-Aktionen (statt Blau für Tenant)
- **Cards**: Moderne KPI-Cards mit farbigen Border-Left-Akzenten
- **Tabellen**: Clean, responsive, mit Hover-States
- **Modals**: Overlay-Modals für Create/Edit-Formulare
- **Footer**: Konsistent mit Tenant-Portalen

## Sicherheit

✅ **Host-Validierung**: Nur `admin.localhost` und `admin.abfertigung.io` erlaubt
✅ **Separate Auth**: Admin-Token komplett getrennt von Tenant-Token
✅ **Middleware-Guards**: Admin-Routes sind geschützt
✅ **API-Auth**: Alle Admin-API-Routes prüfen `admin-token`
✅ **Tenant-Isolation**: Admin kann nicht als Tenant-User agieren
✅ **No Cross-Tenant**: Admin-Mode hat keine Tenant-Guards

## Erweiterbarkeit

Das System ist für zukünftige Erweiterungen vorbereitet:

### OCR-Statistiken (später)
- Dokumentanzahl pro Zeitraum
- Dokumente pro Mitarbeiter
- Top Kunden/Firmen
- Zielländer-Statistik

### Weitere Tenant-Daten-Module
- Bürgschaften CRUD
- Routen CRUD
- Bewilligungen CRUD
- Warenorte CRUD
- User-Verwaltung pro Tenant

### Audit-Log
- Alle Admin-Aktionen protokollieren
- Wer hat wann was geändert

### Dashboard-Widgets
- Diagramme/Charts
- Trend-Analysen
- Export-Funktionen

## Troubleshooting

### Admin-Portal lädt nicht

1. Prüfe Hosts-Eintrag:
   ```powershell
   Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "admin.localhost"
   ```

2. Prüfe ob Server läuft:
   ```powershell
   curl http://admin.localhost:3000
   ```

3. Prüfe Browser-Console auf Fehler

### Login funktioniert nicht

1. Prüfe ob Super-Admin existiert:
   ```powershell
   npx tsx scripts/bootstrap-superadmin.ts
   ```

2. Prüfe Datenbank-Verbindung (`.env`)

3. Prüfe Browser-Cookies (lösche alte Cookies)

### Live-Statistiken zeigen keine User

1. Prüfe ob Heartbeat-Client läuft (Browser DevTools → Network)
2. Melde dich als Tenant-User an
3. Warte 60 Sekunden (erster Heartbeat)
4. Aktualisiere Live-Statistiken

### Tenant-Portal funktioniert nicht mehr

Das sollte **nicht** passieren! Die Tenant-Logik ist unverändert.

Falls doch:
1. Prüfe Middleware (`src/middleware.ts`)
2. Prüfe ob `isAdminMode` korrekt erkannt wird
3. Prüfe Tenant-Routes (sollten keine Admin-Guards haben)

## Dateien-Übersicht

### Prisma
- `prisma/schema.prisma` - SuperAdmin, UserSession, Tenant.status
- `prisma/migrations/20251223120000_add_super_admin_and_sessions/` - Migration

### Scripts
- `scripts/bootstrap-superadmin.ts` - Erstellt ersten Super-Admin

### Middleware & Auth
- `src/middleware.ts` - Admin-Mode Erkennung + Guards
- `src/lib/tenant.ts` - Host-Validierung mit `isAdminMode`
- `src/lib/auth.ts` - JWT-Funktionen (unverändert)

### Admin Pages
- `src/app/admin/login/page.tsx` - Admin Login
- `src/app/admin/page.tsx` - Admin Dashboard Home
- `src/app/admin/layout.tsx` - Admin Layout
- `src/app/admin/tenants/page.tsx` - Tenant-Verwaltung
- `src/app/admin/live/page.tsx` - Live-Statistiken
- `src/app/admin/tenant-data/[tenantId]/page.tsx` - Tenant-Daten

### Admin API Routes
- `src/app/api/admin/login/route.ts` - Admin Login API
- `src/app/api/admin/logout/route.ts` - Admin Logout API
- `src/app/api/admin/me/route.ts` - Admin User Info API
- `src/app/api/admin/tenants/route.ts` - Tenant CRUD (List, Create)
- `src/app/api/admin/tenants/[id]/route.ts` - Tenant CRUD (Get, Update, Delete)
- `src/app/api/admin/live/route.ts` - Live-Statistiken API
- `src/app/api/admin/tenant-data/[tenantId]/companies/route.ts` - Firmen CRUD
- `src/app/api/admin/tenant-data/[tenantId]/companies/[id]/route.ts` - Firma Update/Delete

### Heartbeat
- `src/app/api/heartbeat/route.ts` - Heartbeat API
- `src/components/HeartbeatClient.tsx` - Client-Component
- `src/app/dashboard/layout.tsx` - HeartbeatClient eingebunden

## Produktion

### Deployment

1. **DNS**: Wildcard-Eintrag für `*.abfertigung.io` (bereits vorhanden)
2. **Cloud Run**: Akzeptiert alle Subdomains (bereits konfiguriert)
3. **Umgebungsvariablen**: `JWT_SECRET`, `DATABASE_URL`
4. **Super-Admin**: Bootstrap-Script auf Prod ausführen

### Sicherheit (Produktion)

⚠️ **Wichtig**:
- Ändere Super-Admin-Passwort sofort nach Bootstrap
- Verwende starkes Passwort (min. 16 Zeichen)
- Aktiviere 2FA (später implementieren)
- Beschränke Admin-Zugriff auf VPN/IP-Whitelist (optional)
- Aktiviere Audit-Logging (später implementieren)

## Support

Bei Fragen oder Problemen:
1. Prüfe diese Dokumentation
2. Prüfe Browser-Console + Network-Tab
3. Prüfe Server-Logs (`npm run dev`)
4. Prüfe Datenbank (Prisma Studio: `npx prisma studio`)

