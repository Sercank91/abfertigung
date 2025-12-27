# Fix: Username Unique Constraint

## Problem

Beim Versuch, einen Benutzer mit dem gleichen Username (z.B. "admin") in verschiedenen Tenants anzulegen, erschien der Fehler:

```
Unique constraint failed on the fields: (`username`)
```

**Erwartetes Verhalten:**
- ✅ Username "admin" in Tenant "verag" → OK
- ✅ Username "admin" in Tenant "dsv" → OK
- ✅ Username "admin" in Tenant "atilla" → OK
- ❌ Username "admin" zweimal in Tenant "verag" → FEHLER

**Tatsächliches Verhalten:**
- ✅ Username "admin" in Tenant "verag" → OK
- ❌ Username "admin" in Tenant "dsv" → FEHLER (globaler Constraint)

## Ursache

Es gab einen **globalen** Unique Constraint auf `username` in der Datenbank:
- `User_username_key` (global)

Aber das Prisma Schema definiert nur einen **Tenant-spezifischen** Constraint:
- `@@unique([tenantId, username])` (pro Tenant)

Dies war ein Überbleibsel aus einer alten Migration.

## Lösung

### Migration erstellt

**Datei**: `prisma/migrations/20251223130000_remove_global_username_constraint/migration.sql`

```sql
-- Entferne globale Unique Constraints
DROP INDEX IF EXISTS "User_username_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_username_key";

DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
```

### Migration angewendet

```powershell
npx prisma migrate deploy
```

## Ergebnis

✅ **Problem gelöst!**

Jetzt können Benutzer mit dem gleichen Username in verschiedenen Tenants angelegt werden:

```
📊 ERGEBNIS:
User mit Username "admin": 3
  - Verag Spedition GmbH (verag)
  - DSV Spedition (dsv)
  - Atilla Spedition GmbH (atilla)

✅ ERFOLG: Username kann in mehreren Tenants verwendet werden!
```

## Test

### Manueller Test im Admin-Portal

1. **Öffne**: `http://admin.localhost:3000/admin/tenant-data/[tenantId]/users`

2. **Erstelle Benutzer**:
   - Verag: Username "admin" → ✅ Funktioniert
   - DSV: Username "admin" → ✅ Funktioniert jetzt!
   - Atilla: Username "admin" → ✅ Funktioniert jetzt!

3. **Teste Login**:
   - `http://verag.localhost:3000` → Login: admin / Test123!
   - `http://dsv.localhost:3000` → Login: admin / Test123!
   - `http://atilla.localhost:3000` → Login: admin / Test123!

### Automatischer Test

```powershell
npx tsx scripts/test-user-creation.ts
```

Sollte ausgeben:
```
✅ ERFOLG: Username kann in mehreren Tenants verwendet werden!
   Die Unique Constraints sind korrekt konfiguriert.
```

## Constraints nach dem Fix

### ✅ Korrekte Constraints (pro Tenant):
- `User_tenantId_username_key` → UNIQUE(tenantId, username)
- `User_tenantId_email_key` → UNIQUE(tenantId, email)

### ❌ Entfernte Constraints (global):
- `User_username_key` → Entfernt ✅
- `User_email_key` → Entfernt ✅

## Prisma Schema (korrekt)

```prisma
model User {
  id       String @id @default(uuid())
  username String
  email    String?
  // ...
  tenantId String
  
  // Username und Email sind pro Tenant eindeutig, nicht global
  @@unique([tenantId, username])
  @@unique([tenantId, email])
  @@index([tenantId])
}
```

## Zusammenfassung

✅ **Problem**: Globaler Unique Constraint auf `username`
✅ **Lösung**: Migration entfernt globalen Constraint
✅ **Ergebnis**: Username kann in mehreren Tenants verwendet werden
✅ **Sicherheit**: Username bleibt pro Tenant eindeutig

Jetzt kannst du im Admin-Portal Benutzer mit dem gleichen Username für verschiedene Tenants anlegen! 🎉

