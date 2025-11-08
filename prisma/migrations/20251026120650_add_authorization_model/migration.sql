-- CreateTable
CREATE TABLE "Authorization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Authorization_tenantId_idx" ON "Authorization"("tenantId");

-- CreateIndex
CREATE INDEX "Authorization_tenantId_name_idx" ON "Authorization"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Authorization_tenantId_name_key" ON "Authorization"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "Authorization" ADD CONSTRAINT "Authorization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
