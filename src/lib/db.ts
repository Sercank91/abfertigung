import { Pool, QueryResult, QueryResultRow } from 'pg';

// Singleton Pattern für PostgreSQL Connection
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
};

const internalPool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = internalPool;
}

// 🔒 SECURITY: Feature-Flag für Tenant-Guard
// Default: true in dev/test, false in production (für sanfte Migration)
const isStrictTenantGuard = process.env.DB_STRICT_TENANT_GUARD === 'true' || 
  (process.env.DB_STRICT_TENANT_GUARD !== 'false' && process.env.NODE_ENV !== 'production');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * 🔒 SECURITY: Tenant-sichere Datenbankabfragen
 * 
 * ⚠️ WICHTIG: Raw SQL NUR über diese Funktionen verwenden!
 * 
 * Diese Wrapper-Funktionen erzwingen Tenant-Isolation und verhindern
 * versehentliche Cross-Tenant Datenlecks.
 * 
 * REGELN:
 * 1. NIEMALS direkten Pool-Zugriff verwenden
 * 2. IMMER tenantId als ersten Parameter übergeben
 * 3. IMMER parameterized queries verwenden (keine String-Interpolation)
 * 4. SQL MUSS "tenantId" enthalten (wird automatisch geprüft)
 * 
 * Für Prisma: Nutze Prisma Client direkt (hat eigene Tenant-Logik)
 */

/**
 * 🛡️ Tenant-sichere Query-Funktion
 * 
 * @param tenantId - Die Tenant-ID (PFLICHT) - aus user.tenantId vom JWT Token
 * @param text - SQL Query (MUSS "tenantId" enthalten)
 * @param params - Query Parameter (parameterized query)
 * @returns Query Result
 * 
 * @example
 * ```typescript
 * const user = await getUserFromToken(request);
 * const result = await queryTenant(
 *   user.tenantId,
 *   'SELECT * FROM "User" WHERE "tenantId" = $1 AND username = $2',
 *   [user.tenantId, 'john']
 * );
 * ```
 */
export async function queryTenant<T extends QueryResultRow = any>(
  tenantId: string,
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  // 🔒 SECURITY CHECK 1: tenantId MUSS vorhanden sein
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error(
      '🔒 SECURITY: tenantId ist erforderlich für Datenbankzugriff. ' +
      'Verwende user.tenantId aus dem JWT Token.'
    );
  }

  // 🔒 SECURITY CHECK 2: SQL MUSS "tenantId" enthalten (Case-Insensitive)
  const normalizedSql = text.toLowerCase();
  if (!normalizedSql.includes('tenantid') && !normalizedSql.includes('"tenantid"')) {
    // Ausnahme: System-Queries (z.B. Login, Tenant-Lookup)
    const isSystemQuery = 
      normalizedSql.includes('from "tenant"') || 
      normalizedSql.includes('select 1') ||
      normalizedSql.includes('select count(*)') && normalizedSql.includes('from "tenant"');
    
    if (!isSystemQuery) {
      console.error('🔒 SECURITY VIOLATION: SQL ohne tenantId-Filter blockiert:', text);
      throw new Error(
        '🔒 SECURITY: SQL Query MUSS "tenantId" Filter enthalten. ' +
        'Dies verhindert Cross-Tenant Datenlecks.'
      );
    }
  }

  // 🔒 SECURITY CHECK 3: Keine String-Interpolation (verhindert SQL Injection)
  if (text.includes('${') || text.includes('`')) {
    throw new Error(
      '🔒 SECURITY: String-Interpolation in SQL ist verboten. ' +
      'Verwende parameterized queries ($1, $2, etc.).'
    );
  }

  // ✅ Query ausführen
  try {
    return await internalPool.query<T>(text, params);
  } catch (error) {
    // 🔒 SECURITY: Logging mit Redaction in Production
    if (isProduction) {
      // Production: Keine sensiblen Parameter loggen
      const querySnippet = text.length > 200 ? text.substring(0, 200) + '...' : text;
      console.error('❌ Database Query Error:', error);
      console.error('Query:', querySnippet);
      // KEINE Params in Production loggen (könnten Passwörter/sensible Daten enthalten)
    } else {
      // Development: Vollständiges Logging für Debugging
      console.error('❌ Database Query Error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
    }
    throw error;
  }
}

/**
 * 🛡️ System-Query ohne Tenant-Validierung
 * 
 * ⚠️ NUR für System-Queries verwenden (Login, Tenant-Lookup, Health Checks)
 * ⚠️ NIEMALS für User-Daten verwenden!
 * 
 * @param text - SQL Query
 * @param params - Query Parameter
 * @returns Query Result
 * 
 * @example
 * ```typescript
 * // Login: Tenant finden
 * const tenant = await querySystem(
 *   'SELECT id, name FROM "Tenant" WHERE domain = $1',
 *   [subdomain]
 * );
 * ```
 */
export async function querySystem<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  // 🔒 SECURITY: Logge System-Queries nur in Development
  if (!isProduction) {
    console.log('🔧 SYSTEM QUERY:', text.substring(0, 100));
  }

  try {
    return await internalPool.query<T>(text, params);
  } catch (error) {
    // 🔒 SECURITY: Logging mit Redaction in Production
    if (isProduction) {
      const querySnippet = text.length > 200 ? text.substring(0, 200) + '...' : text;
      console.error('❌ System Query Error:', error);
      console.error('Query:', querySnippet);
    } else {
      console.error('❌ System Query Error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
    }
    throw error;
  }
}

/**
 * @deprecated NICHT VERWENDEN! Nutze queryTenant() oder querySystem()
 * 
 * ⚠️ WICHTIG: Direkter Pool-Zugriff ist in PRODUCTION HART DEAKTIVIERT!
 * 
 * Feature-Flag: DB_STRICT_TENANT_GUARD
 * - true (default in dev): Wirft Error
 * - false: Wirft Error in production, Warning in dev
 * 
 * Migration: Ersetze alle pool.query() Aufrufe durch:
 * - queryTenant(user.tenantId, sql, params) für Tenant-Daten
 * - querySystem(sql, params) für System-Queries (Login, Tenant-Lookup)
 */
export const pool = {
  query: async <T extends QueryResultRow = any>(
    text: string, 
    params?: any[]
  ): Promise<QueryResult<T>> => {
    // 🔒 PRODUCTION: HART BLOCKIERT
    if (isProduction) {
      console.error(
        '🔒 SECURITY VIOLATION: Direkter pool.query() in Production blockiert!\n' +
        'Query: ' + text.substring(0, 100) + (text.length > 100 ? '...' : '')
      );
      throw new Error(
        '🔒 SECURITY: Raw SQL pool.query() ist in Production deaktiviert. ' +
        'Verwende queryTenant(tenantId, sql, params) oder querySystem(sql, params).'
      );
    }

    // 🔒 DEV: STRICT MODE
    if (isStrictTenantGuard) {
      throw new Error(
        '🔒 SECURITY: Direkter pool.query() Zugriff ist deaktiviert. ' +
        'Verwende queryTenant(tenantId, sql, params) oder querySystem(sql, params) für System-Queries.'
      );
    }
    
    // ⚠️ DEV LEGACY MODE: Erlaube Query, aber warne
    const querySnippet = text.length > 100 ? text.substring(0, 100) + '...' : text;
    console.warn('⚠️ DEPRECATED: Direkter pool.query() Zugriff. Migriere zu queryTenant()');
    console.warn('Query:', querySnippet);
    
    // Führe Query aus (nur in dev legacy mode)
    return await internalPool.query<T>(text, params);
  }
};
