-- Entferne globale Unique Constraints auf username und email
-- Diese sollten nur pro Tenant eindeutig sein

-- Entferne globalen Unique Constraint auf username
DROP INDEX IF EXISTS "User_username_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_username_key";

-- Entferne globalen Unique Constraint auf email  
DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Die korrekten Constraints (pro Tenant) existieren bereits:
-- - User_tenantId_username_key (@@unique([tenantId, username]))
-- - User_tenantId_email_key (@@unique([tenantId, email]))

