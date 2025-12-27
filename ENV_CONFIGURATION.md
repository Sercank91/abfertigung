# 🔒 Environment Configuration - DB Security

## DB_STRICT_TENANT_GUARD Feature-Flag

### Zweck
Kontrolliert, ob direkter `pool.query()` Zugriff blockiert wird oder nur gewarnt wird.

### Werte

| Wert | Verhalten | Empfohlen für |
|------|-----------|---------------|
| `true` | `pool.query()` wirft Error | Development, Test, neue Projekte |
| `false` | `pool.query()` funktioniert, loggt Warning | Production (während Migration) |
| nicht gesetzt | Auto-Detect (siehe unten) | - |

### Default-Verhalten (wenn ENV nicht gesetzt)

```typescript
// Development/Test: STRICT (true)
NODE_ENV=development → DB_STRICT_TENANT_GUARD=true (implizit)

// Production: LEGACY (false)
NODE_ENV=production → DB_STRICT_TENANT_GUARD=false (implizit)
```

---

## 📝 Empfohlene Konfiguration

### Development (.env.local)
```bash
# Erzwinge sichere Queries in Development
DB_STRICT_TENANT_GUARD=true

# Vollständiges Logging (Query + Params)
NODE_ENV=development
```

**Effekt:**
- ✅ `pool.query()` wirft Error → Entwickler muss `queryTenant()` verwenden
- ✅ Vollständiges Error-Logging mit Query + Params
- ✅ System-Queries werden geloggt

---

### Production (Cloud Run / Vercel / etc.)
```bash
# Legacy-Modus: Alte Queries funktionieren noch
DB_STRICT_TENANT_GUARD=false

# Reduziertes Logging (keine sensiblen Daten)
NODE_ENV=production
```

**Effekt:**
- ⚠️ `pool.query()` funktioniert noch (Legacy-Kompatibilität)
- ⚠️ Loggt Warning: "DEPRECATED: Direkter pool.query() Zugriff"
- 🔒 Reduziertes Logging (keine Params, Query max 200 chars)
- 🔒 System-Queries werden NICHT geloggt (Security)

---

### Production (nach vollständiger Migration)
```bash
# Alle Queries migriert → Aktiviere Strict Mode
DB_STRICT_TENANT_GUARD=true

NODE_ENV=production
```

**Effekt:**
- ✅ `pool.query()` wirft Error → Garantiert sichere Queries
- 🔒 Reduziertes Logging (keine Params)
- 🔒 System-Queries werden NICHT geloggt

---

## 🧪 Testing

### Test 1: Development Strict Mode
```bash
# .env.local
DB_STRICT_TENANT_GUARD=true
NODE_ENV=development
```

```typescript
// ❌ Sollte Error werfen
import { pool } from '@/lib/db';
await pool.query('SELECT * FROM "User"');
// Error: "Direkter pool.query() Zugriff ist deaktiviert"

// ✅ Sollte funktionieren
import { queryTenant } from '@/lib/db';
await queryTenant(tenantId, 'SELECT * FROM "User" WHERE "tenantId" = $1', [tenantId]);
```

---

### Test 2: Production Legacy Mode
```bash
# Production ENV
DB_STRICT_TENANT_GUARD=false
NODE_ENV=production
```

```typescript
// ⚠️ Funktioniert, aber loggt Warning
import { pool } from '@/lib/db';
await pool.query('SELECT * FROM "User" WHERE "tenantId" = $1', [tenantId]);
// Console: "⚠️ DEPRECATED: Direkter pool.query() Zugriff"
```

---

## 📊 Logging-Verhalten

### Development (NODE_ENV !== 'production')
```typescript
// queryTenant Error:
console.error('❌ Database Query Error:', error);
console.error('Query:', text);              // Vollständige Query
console.error('Params:', params);           // Alle Parameter

// querySystem:
console.log('🔧 SYSTEM QUERY:', text.substring(0, 100));

// pool.query (Legacy):
console.warn('⚠️ DEPRECATED: Direkter pool.query() Zugriff');
console.warn('Query:', querySnippet);       // Erste 100 chars
```

### Production (NODE_ENV === 'production')
```typescript
// queryTenant Error:
console.error('❌ Database Query Error:', error);
console.error('Query:', querySnippet);      // Max 200 chars
// KEINE Params (könnten Passwörter enthalten)

// querySystem:
// KEIN Logging (Security)

// pool.query (Legacy):
console.warn('⚠️ DEPRECATED: Direkter pool.query() Zugriff');
// Keine Query-Details
```

---

## 🚀 Migrations-Strategie

### Phase 1: Soft Launch (JETZT)
```bash
# Production
DB_STRICT_TENANT_GUARD=false  # Legacy-Modus
```
- ✅ Alte Queries funktionieren noch
- ⚠️ Warnings in Logs → Identifiziere nicht-migrierte Stellen
- 🔒 Neue Queries nutzen `queryTenant()`

### Phase 2: Migration (1-2 Wochen)
- Migriere alle `pool.query()` zu `queryTenant()`
- Nutze Warnings in Logs als Checkliste
- Teste in Development mit `DB_STRICT_TENANT_GUARD=true`

### Phase 3: Strict Mode (nach Migration)
```bash
# Production
DB_STRICT_TENANT_GUARD=true  # Strict-Modus
```
- ✅ Alle Queries sind sicher
- ✅ Keine Legacy-Queries mehr möglich
- 🔒 Maximale Tenant-Isolation

---

## 🔒 Security Best Practices

### 1. Niemals sensible Daten in Production loggen
```typescript
// ❌ FALSCH
console.log('Password:', password);

// ✅ RICHTIG
// Gar nicht loggen oder nur in Development
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info:', data);
}
```

### 2. Query-Params können sensibel sein
```typescript
// Params können enthalten:
// - Passwörter
// - Tokens
// - Persönliche Daten
// → Niemals in Production loggen!
```

### 3. Query-Snippets sind OK
```typescript
// ✅ OK in Production (keine sensiblen Daten)
console.error('Query:', text.substring(0, 200));
```

---

## 📚 Zusammenfassung

| Environment | DB_STRICT_TENANT_GUARD | pool.query() | Logging |
|-------------|------------------------|--------------|---------|
| Dev (default) | `true` | ❌ Error | Vollständig (Query + Params) |
| Dev (explizit false) | `false` | ⚠️ Warning | Vollständig (Query + Params) |
| Prod (default) | `false` | ⚠️ Warning | Reduziert (Query max 200 chars) |
| Prod (explizit true) | `true` | ❌ Error | Reduziert (Query max 200 chars) |

**Empfehlung:**
- Development: `DB_STRICT_TENANT_GUARD=true` (erzwinge sichere Queries)
- Production (Migration): `DB_STRICT_TENANT_GUARD=false` (Legacy-Kompatibilität)
- Production (final): `DB_STRICT_TENANT_GUARD=true` (maximale Sicherheit)







