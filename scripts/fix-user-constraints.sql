-- Entferne globale Unique Constraints auf username und email
-- Diese sollten nur pro Tenant eindeutig sein (@@unique([tenantId, username]))

-- 1. Entferne globalen Unique Constraint auf username (falls vorhanden)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_username_key";

-- 2. Entferne globalen Unique Constraint auf email (falls vorhanden)
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Die korrekten Constraints (pro Tenant) sollten bereits existieren:
-- - User_tenantId_username_key (@@unique([tenantId, username]))
-- - User_tenantId_email_key (@@unique([tenantId, email]))

-- Prüfe ob die korrekten Constraints existieren
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_tenantId_username_key'
    ) THEN
        -- Erstelle Constraint falls nicht vorhanden
        ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_username_key" 
            UNIQUE ("tenantId", "username");
        RAISE NOTICE 'Constraint User_tenantId_username_key erstellt';
    ELSE
        RAISE NOTICE 'Constraint User_tenantId_username_key existiert bereits';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_tenantId_email_key'
    ) THEN
        -- Erstelle Constraint falls nicht vorhanden
        ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_email_key" 
            UNIQUE ("tenantId", "email");
        RAISE NOTICE 'Constraint User_tenantId_email_key erstellt';
    ELSE
        RAISE NOTICE 'Constraint User_tenantId_email_key existiert bereits';
    END IF;
END $$;

