-- ============================================================================
-- NON-DESTRUCTIVE MIGRATION: Tenant-Scoped AnmNrSequence
-- ============================================================================
-- 
-- Ziel: AnmNrSequence von global (jahr @id) auf tenant-scoped umstellen
--       (tenantId + jahr als composite key)
--
-- Strategie (Option B - Daten erhalten):
-- 1. Neue Tabelle "AnmNrSequence_new" mit tenant-scoped Schema erstellen
-- 2. Bestehende Daten migrieren (alle Tenants bekommen die globalen Sequenzen)
-- 3. Alte Tabelle droppen
-- 4. Neue Tabelle umbenennen
-- 5. Constraints und Indizes erstellen
-- ============================================================================

-- STEP 1: Neue Tabelle mit tenant-scoped Schema erstellen
CREATE TABLE "AnmNrSequence_new" (
    "tenantId" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,
    "letzteNummer" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- STEP 2: Daten migrieren (nur wenn alte Tabelle existiert)
-- Für jeden Tenant die bestehenden Sequenzen kopieren
-- Falls keine Daten vorhanden sind, wird nichts kopiert (sicher)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AnmNrSequence') THEN
        INSERT INTO "AnmNrSequence_new" ("tenantId", "jahr", "letzteNummer", "createdAt", "updatedAt")
        SELECT 
            t.id as "tenantId",
            s.jahr,
            s."letzteNummer",
            s."createdAt",
            s."updatedAt"
        FROM "Tenant" t
        CROSS JOIN "AnmNrSequence" s;
        
        -- STEP 3: Alte Tabelle droppen
        DROP TABLE "AnmNrSequence";
    END IF;
END $$;

-- STEP 4: Neue Tabelle umbenennen
ALTER TABLE "AnmNrSequence_new" RENAME TO "AnmNrSequence";

-- STEP 5: Constraints und Indizes erstellen
-- Primary Key (composite)
ALTER TABLE "AnmNrSequence" ADD CONSTRAINT "AnmNrSequence_pkey" PRIMARY KEY ("tenantId", "jahr");

-- Foreign Key zu Tenant (mit CASCADE DELETE)
ALTER TABLE "AnmNrSequence" ADD CONSTRAINT "AnmNrSequence_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index für Performance
CREATE INDEX "AnmNrSequence_tenantId_idx" ON "AnmNrSequence"("tenantId");

-- ============================================================================
-- MIGRATION ABGESCHLOSSEN
-- ============================================================================
-- 
-- Ergebnis:
-- - Alle bestehenden Sequenzen wurden für ALLE Tenants dupliziert
-- - Jeder Tenant hat jetzt seine eigenen Sequenzen
-- - Keine Daten gingen verloren
-- - Neue Struktur ist tenant-scoped und sicher
-- ============================================================================

