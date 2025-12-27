# Tenant-Löschung - Bugfix

## Problem

Wenn ein Tenant im Admin-Portal gelöscht wurde (Soft-Delete):
1. ❌ Der Tenant erschien weiterhin in der Tenant-Liste
2. ❌ Der Tenant war weiterhin unter `<tenant>.localhost:3000` aufrufbar

## Lösung

### 1. Tenant-Liste filtert gelöschte Tenants

**Datei:** `src/app/api/admin/tenants/route.ts`

Die API-Route filtert jetzt gelöschte Tenants heraus:

```typescript
const tenants = await prisma.tenant.findMany({
  where: {
    status: {
      not: 'deleted' // Zeige keine gelöschten Tenants
    }
  },
  // ...
});
```

### 2. Server Components blockieren gelöschte/inaktive Tenants

**Dateien:** 
- `src/app/page.tsx` (Login-Page)
- `src/app/dashboard/layout.tsx` (Dashboard-Layout)

Die Server Components prüfen den Tenant-Status und zeigen eine Fehlermeldung:

**Login-Page (`src/app/page.tsx`):**
```typescript
// Prüfe Tenant-Status
if (tenant.status === 'deleted') {
  return (
    <div>
      <h2>Tenant wurde gelöscht</h2>
      <p>Der Tenant {tenant.name} wurde gelöscht und ist nicht mehr verfügbar.</p>
    </div>
  );
}

if (tenant.status === 'inactive') {
  return (
    <div>
      <h2>Tenant ist deaktiviert</h2>
      <p>Der Tenant {tenant.name} ist vorübergehend deaktiviert.</p>
    </div>
  );
}
```

**Dashboard-Layout (`src/app/dashboard/layout.tsx`):**
```typescript
async function checkTenantStatus() {
  const headersList = headers();
  const hostHeader = headersList.get('host');
  const subdomain = getSubdomainFromHost(hostHeader);
  
  if (subdomain) {
    const tenant = await prisma.tenant.findUnique({
      where: { domain: subdomain },
      select: { status: true }
    });
    
    if (!tenant || tenant.status === 'deleted' || tenant.status === 'inactive') {
      redirect('/'); // Redirect zur Login-Page mit Fehlermeldung
    }
  }
}
```

**Warum nicht in der Middleware?**
- Prisma Client kann nicht in Edge Runtime (Middleware) laufen
- Server Components können Prisma verwenden
- Login-Page und Dashboard-Layout sind Server Components

### 3. CLI-Tool zum Löschen von Tenants

**Datei:** `scripts/delete-tenant.ts`

Neues Script zum einfachen Löschen von Tenants:

```powershell
npm run tenant:delete <domain>

# Beispiel:
npm run tenant:delete atilla
```

**Output:**
```
📦 Tenant gefunden: Atilla Spedition GmbH
   Domain: atilla
   Status: active
   Users: 0
   Companies: 0
   Clearances: 0

✅ Tenant "Atilla Spedition GmbH" wurde als gelöscht markiert (Soft-Delete)
   Der Tenant ist jetzt nicht mehr aufrufbar
   Die Daten bleiben in der Datenbank erhalten
```

## Testen

### 1. Tenant löschen (Soft-Delete)

**Option A: Admin-Portal**
1. Öffne `http://admin.localhost:3000/admin/tenants`
2. Klicke bei einem Tenant auf "Löschen"
3. Bestätige die Löschung

**Option B: CLI**
```powershell
npm run tenant:delete <domain>
```

### 2. Prüfen: Tenant erscheint nicht mehr in der Liste

Öffne `http://admin.localhost:3000/admin/tenants`
- ✅ Der gelöschte Tenant sollte **nicht** mehr in der Liste erscheinen

### 3. Prüfen: Tenant ist nicht mehr aufrufbar

Öffne `http://<tenant>.localhost:3000`
- ✅ Du solltest einen **403 Fehler** sehen: "Dieser Tenant wurde gelöscht"

### 4. Prüfen: Daten sind noch in der Datenbank

```powershell
npm run db:check
```

Output zeigt alle Tenants (auch gelöschte):
```
📦 Tenant: Atilla Spedition GmbH
   Domain: atilla
   Status: deleted  ← Soft-Delete
   Users: 0
   Companies: 0
   Clearances: 0
```

## Tenant-Status

Ein Tenant kann folgende Status haben:

- **`active`** - Aktiv, normal nutzbar
- **`inactive`** - Deaktiviert, nicht aufrufbar (z.B. bei Zahlungsausfall)
- **`deleted`** - Gelöscht (Soft-Delete), nicht aufrufbar, erscheint nicht in Listen

## Hard-Delete (Komplett löschen)

Wenn du einen Tenant **komplett** aus der Datenbank löschen möchtest (z.B. um ihn neu anzulegen):

### Option 1: CLI-Tool (empfohlen)

```powershell
npm run tenant:hard-delete <domain>

# Beispiel:
npm run tenant:hard-delete atilla
```

**Output:**
```
📦 Tenant gefunden: Atilla Spedition GmbH
   Domain: atilla
   Status: deleted
   Users: 0
   Companies: 0
   Clearances: 0

⚠️  WARNUNG: HARD DELETE!
   Dieser Tenant wird KOMPLETT aus der Datenbank gelöscht!
   Alle zugehörigen Daten (Users, Companies, etc.) werden ebenfalls gelöscht!
   Diese Aktion kann NICHT rückgängig gemacht werden!

✅ Tenant "Atilla Spedition GmbH" wurde KOMPLETT gelöscht (Hard-Delete)
   Alle zugehörigen Daten wurden ebenfalls gelöscht
   Die Domain "atilla" kann jetzt neu angelegt werden
```

⚠️ **WARNUNG**: Dies löscht auch alle zugehörigen Daten (Users, Companies, Clearances, etc.) durch CASCADE DELETE!

### Option 2: Prisma Studio

```powershell
npx prisma studio
```

1. Öffne die `Tenant` Tabelle
2. Suche den Tenant
3. Klicke auf "Delete"
4. Bestätige die Löschung

### Option 3: SQL (für Fortgeschrittene)

```sql
DELETE FROM "Tenant" WHERE domain = 'atilla';
```

## Neue npm Scripts

```powershell
npm run tenant:delete <domain>       # Tenant löschen (Soft-Delete)
npm run tenant:hard-delete <domain>  # Tenant KOMPLETT löschen (Hard-Delete)
npm run db:check                     # Datenbank prüfen (zeigt alle Tenants inkl. gelöschte)
```

### Unterschied: Soft-Delete vs Hard-Delete

**Soft-Delete** (`npm run tenant:delete`)
- ✅ Setzt Status auf 'deleted'
- ✅ Tenant ist nicht mehr aufrufbar
- ✅ Tenant erscheint nicht mehr in Listen
- ✅ Daten bleiben in der Datenbank
- ✅ Kann später reaktiviert werden
- ❌ Domain kann nicht neu angelegt werden

**Hard-Delete** (`npm run tenant:hard-delete`)
- ✅ Löscht Tenant komplett aus der Datenbank
- ✅ Löscht ALLE zugehörigen Daten (Users, Companies, etc.)
- ✅ Domain kann neu angelegt werden
- ❌ Daten sind unwiederbringlich verloren
- ❌ Kann NICHT rückgängig gemacht werden

## Geänderte Dateien

1. `src/app/api/admin/tenants/route.ts` - Filter für gelöschte Tenants
2. `src/app/page.tsx` - Blockierung von gelöschten/inaktiven Tenants (Login-Page)
3. `src/app/dashboard/layout.tsx` - Blockierung von gelöschten/inaktiven Tenants (Dashboard)
4. `scripts/delete-tenant.ts` - CLI-Tool zum Soft-Delete (NEU)
5. `scripts/hard-delete-tenant.ts` - CLI-Tool zum Hard-Delete (NEU)
6. `package.json` - Neue Scripts `tenant:delete` und `tenant:hard-delete`

## Zusammenfassung

✅ Gelöschte Tenants erscheinen nicht mehr in der Admin-Liste
✅ Gelöschte Tenants sind nicht mehr aufrufbar (403 Fehler)
✅ Inaktive Tenants sind ebenfalls blockiert
✅ Daten bleiben in der Datenbank erhalten (Soft-Delete)
✅ CLI-Tool für einfaches Löschen
✅ Hard-Delete über Prisma Studio möglich

