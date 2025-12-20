-- 1. Drop old Primary Key
ALTER TABLE "AnmNrSequence" DROP CONSTRAINT "AnmNrSequence_pkey";

-- 2. Truncate table to allow NOT NULL column addition (Clean Slate Strategy)
-- WARNING: This deletes existing sequence counters. New counters will start at 1.
DELETE FROM "AnmNrSequence";

-- 3. Add tenantId column
ALTER TABLE "AnmNrSequence" ADD COLUMN "tenantId" TEXT NOT NULL;

-- 4. Add new Composite Primary Key
ALTER TABLE "AnmNrSequence" ADD CONSTRAINT "AnmNrSequence_pkey" PRIMARY KEY ("jahr", "tenantId");

-- 5. Add Foreign Key
ALTER TABLE "AnmNrSequence" ADD CONSTRAINT "AnmNrSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
