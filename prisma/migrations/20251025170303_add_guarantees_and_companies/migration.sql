-- CreateTable
CREATE TABLE "Guarantee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guarantee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "emails" TEXT[],
    "phones" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyGuarantee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "guaranteeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyGuarantee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guarantee_tenantId_idx" ON "Guarantee"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Guarantee_tenantId_name_key" ON "Guarantee"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "Company_tenantId_name_idx" ON "Company"("tenantId", "name");

-- CreateIndex
CREATE INDEX "CompanyGuarantee_companyId_idx" ON "CompanyGuarantee"("companyId");

-- CreateIndex
CREATE INDEX "CompanyGuarantee_guaranteeId_idx" ON "CompanyGuarantee"("guaranteeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyGuarantee_companyId_guaranteeId_key" ON "CompanyGuarantee"("companyId", "guaranteeId");

-- AddForeignKey
ALTER TABLE "Guarantee" ADD CONSTRAINT "Guarantee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyGuarantee" ADD CONSTRAINT "CompanyGuarantee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyGuarantee" ADD CONSTRAINT "CompanyGuarantee_guaranteeId_fkey" FOREIGN KEY ("guaranteeId") REFERENCES "Guarantee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
