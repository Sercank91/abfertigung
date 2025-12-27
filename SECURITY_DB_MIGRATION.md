# 🔒 Security DB Migration - Tenant-Isolation Hardening

## ⚠️ PROBLEM
Das Projekt nutzt Raw SQL (`pool.query`) an 128+ Stellen. Risiko: Entwickler vergisst `tenantId`-Filter → Cross-Tenant Datenleck.

## ✅ LÖSUNG
Zentrale Wrapper-Funktionen in `src/lib/db.ts` erzwingen Tenant-Isolation:
- `queryTenant(tenantId, sql, params)` - Für alle User-Daten (PFLICHT)
- `querySystem(sql, params)` - Nur für System-Queries (Login, Health Checks)

## 📊 FUNDSTELLEN (128 pool.query Aufrufe)

### 🔴 KRITISCH - API Routes (müssen migriert werden)

#### Authentication & Users
- `src/app/api/login/route.ts` - 2x (System-Queries für Login)
- `src/app/api/users/route.ts` - 3x (GET, POST - User-Daten)
- `src/app/api/users/[id]/route.ts` - 5x (GET, PUT, DELETE)
- `src/app/api/auth/me/route.ts` - 1x (User-Profil)
- `src/app/api/profile/route.ts` - 2x (Profil-Update)
- `src/app/api/profile/password/route.ts` - 2x (Passwort-Änderung)

#### Core Business Logic
- `src/app/api/clearances/route.ts` - 8x (Abfertigungen)
- `src/app/api/clearances/[anmNr]/route.ts` - 13x (Einzelne Abfertigung)
- `src/app/api/companies/route.ts` - 1x (Firmen)
- `src/app/api/companies/[id]/route.ts` - 4x (Einzelne Firma)
- `src/app/api/guarantees/route.ts` - 3x (Bürgschaften)
- `src/app/api/guarantees/[id]/route.ts` - 6x (Einzelne Bürgschaft)
- `src/app/api/authorizations/route.ts` - 3x (Bewilligungen)
- `src/app/api/authorizations/[id]/route.ts` - 5x (Einzelne Bewilligung)

#### Supporting Data
- `src/app/api/routes/route.ts` - 5x (Routen)
- `src/app/api/routes/[id]/route.ts` - 6x (Einzelne Route)
- `src/app/api/goods-locations/route.ts` - 3x (Warenlager)
- `src/app/api/goods-locations/[id]/route.ts` - 4x (Einzelnes Warenlager)
- `src/app/api/customs-offices/route.ts` - 1x (Zollämter)
- `src/app/api/employees/route.ts` - 2x (Mitarbeiter)
- `src/app/api/employees/[id]/route.ts` - 5x (Einzelner Mitarbeiter)

#### OCR System
- `src/app/api/ocr/upload/route.ts` - 2x (OCR Upload)
- `src/app/api/ocr/document/[documentId]/route.ts` - 4x (OCR Dokument)
- `src/app/api/ocr/status/[documentId]/route.ts` - 3x (OCR Status)
- `src/app/api/ocr/documents/[clearanceId]/route.ts` - 3x (OCR Dokumente)
- `src/app/api/ocr/shipments/[clearanceId]/route.ts` - 2x (OCR Sendungen)

#### Debug/System
- `src/app/api/debug/route.ts` - 4x (System-Queries - OK)
- `src/app/api/debug/company-guarantees/route.ts` - 4x (Debug)

### 🟡 MEDIUM - Server Components (Dashboard Pages)
- `src/app/dashboard/users/page.tsx` - 1x
- `src/app/dashboard/companies/page.tsx` - 2x
- `src/app/dashboard/clearances/[anmNr]/page.tsx` - 2x
- `src/app/dashboard/authorizations/page.tsx` - 1x
- `src/app/dashboard/goods-locations/page.tsx` - 1x
- `src/app/dashboard/routes/page.tsx` - 2x
- `src/app/dashboard/guarantees/page.tsx` - 1x
- `src/app/dashboard/profile/page.tsx` - 1x

### 🟢 LOW - Utility Functions
- `src/lib/anmnr.ts` - 1x (Anmeldenummer-Generator)

## 🛠️ MIGRATIONS-STRATEGIE

### Phase 1: Core Security (JETZT) ✅
- [x] `src/lib/db.ts` - Wrapper-Funktionen implementiert
- [x] Direkter `pool` Export deaktiviert
- [x] Security-Checks eingebaut

### Phase 2: System-Queries (Login/Auth)
**Dateien:**
- `src/app/api/login/route.ts` → `querySystem()` (Tenant-Lookup, User-Lookup)
- `src/app/api/debug/route.ts` → `querySystem()` (Health Checks)

**Begründung:** Diese Queries laufen VOR der Tenant-Bestimmung.

### Phase 3: API Routes (Kritisch)
**Alle API Routes müssen auf `queryTenant()` umgestellt werden:**

**Pattern:**
```typescript
// ❌ VORHER (UNSICHER)
const result = await pool.query(
  'SELECT * FROM "User" WHERE "tenantId" = $1',
  [user.tenantId]
);

// ✅ NACHHER (SICHER)
import { queryTenant } from '@/lib/db';
const result = await queryTenant(
  user.tenantId,
  'SELECT * FROM "User" WHERE "tenantId" = $1',
  [user.tenantId]
);
```

**TenantId-Quelle:** Alle API Routes nutzen bereits `getUserFromToken()` → `user.tenantId`

### Phase 4: Server Components (Dashboard)
**Pattern:**
```typescript
// ❌ VORHER
import { pool } from '@/lib/db';

// ✅ NACHHER
import { queryTenant } from '@/lib/db';
```

**TenantId-Quelle:** Server Components nutzen `cookies()` → JWT Token → `user.tenantId`

### Phase 5: Utility Functions
- `src/lib/anmnr.ts` → `queryTenant()`

## 🔒 SECURITY FEATURES

### 1. Verpflichtende TenantId
```typescript
queryTenant(tenantId, sql, params)
//         ^^^^^^^^ PFLICHT - wird validiert
```

### 2. SQL muss "tenantId" enthalten
```typescript
// ✅ OK
queryTenant(tenantId, 'SELECT * FROM "User" WHERE "tenantId" = $1', [tenantId]);

// ❌ FEHLER: SQL ohne tenantId-Filter blockiert
queryTenant(tenantId, 'SELECT * FROM "User"', []);
```

### 3. Keine String-Interpolation
```typescript
// ❌ FEHLER: SQL Injection Risiko
queryTenant(tenantId, `SELECT * FROM "User" WHERE id = '${userId}'`);

// ✅ OK: Parameterized Query
queryTenant(tenantId, 'SELECT * FROM "User" WHERE id = $1', [userId]);
```

### 4. Audit Logging
- Alle System-Queries werden geloggt
- Blockierte Queries werden geloggt

## 📝 NÄCHSTE SCHRITTE

### Sofort (Stop-the-bleeding)
1. ✅ Wrapper-Funktionen implementiert
2. ✅ Direkter Pool-Zugriff deaktiviert
3. ⏳ System-Queries migrieren (Login, Debug)

### Kurzfristig (Diese Woche)
4. ⏳ Kritische API Routes migrieren (Users, Clearances, Companies)
5. ⏳ Linter-Regel hinzufügen: "Kein direkter pool.query Import"

### Mittelfristig (Nächste Woche)
6. ⏳ Alle API Routes migrieren
7. ⏳ Server Components migrieren
8. ⏳ Utility Functions migrieren

### Langfristig (Optional)
9. ⏳ Prisma Row Level Security (RLS) evaluieren
10. ⏳ Vollständige Migration zu Prisma (kein Raw SQL)

## 🧪 TESTING

### Manuell testen:
1. Login → sollte funktionieren (querySystem)
2. Dashboard → sollte Fehler werfen (pool.query blockiert)
3. API Routes → sollten Fehler werfen (pool.query blockiert)

### Erwartetes Verhalten:
```
🔒 SECURITY: Direkter pool.query() Zugriff ist deaktiviert.
Verwende queryTenant(tenantId, sql, params) oder querySystem(sql, params)
```

## 📚 DOKUMENTATION

### Für Entwickler:
- **NIEMALS** `import { pool } from '@/lib/db'` verwenden
- **IMMER** `import { queryTenant } from '@/lib/db'` verwenden
- **TenantId** aus `user.tenantId` (JWT Token) holen
- **System-Queries** nur mit `querySystem()` (Login, Health Checks)

### Code Review Checklist:
- [ ] Kein direkter `pool.query()` Aufruf
- [ ] `queryTenant()` mit `user.tenantId` verwendet
- [ ] SQL enthält `WHERE "tenantId" = $1`
- [ ] Parameterized queries verwendet (keine String-Interpolation)

