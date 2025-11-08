-- CreateTable
CREATE TABLE "GoodsLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoodsLocation_tenantId_idx" ON "GoodsLocation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsLocation_tenantId_name_key" ON "GoodsLocation"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "GoodsLocation" ADD CONSTRAINT "GoodsLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
