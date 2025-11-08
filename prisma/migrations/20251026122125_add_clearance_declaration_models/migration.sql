-- CreateTable
CREATE TABLE "Clearance" (
    "id" TEXT NOT NULL,
    "lrn" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "guaranteeId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "licensePlateCountry" TEXT NOT NULL,
    "hasSecondPlate" BOOLEAN NOT NULL DEFAULT false,
    "secondLicensePlate" TEXT,
    "secondPlateCountry" TEXT,
    "routeId" TEXT,
    "simplifiedProcedure" BOOLEAN NOT NULL DEFAULT false,
    "goodsLocationId" TEXT,
    "authorizationId" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_bearbeitung',
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Declaration" (
    "id" TEXT NOT NULL,
    "lrn" TEXT NOT NULL,
    "clearanceId" TEXT NOT NULL,
    "destinationOfficeId" TEXT NOT NULL,
    "mrn" TEXT,
    "registrationNumber" TEXT,
    "declarationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'neu',
    "totalGrossWeight" DOUBLE PRECISION,
    "totalPackages" INTEGER,
    "totalValue" DOUBLE PRECISION,
    "currency" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Declaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportDocument" (
    "id" TEXT NOT NULL,
    "declarationId" TEXT NOT NULL,
    "positionNumber" INTEGER NOT NULL,
    "mrnNumber" TEXT NOT NULL,
    "mrnType" TEXT NOT NULL DEFAULT 'NMRN',
    "procedureCode" TEXT NOT NULL,
    "declarationType" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "senderPostalCode" TEXT NOT NULL,
    "senderCity" TEXT NOT NULL,
    "senderCountry" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "receiverPostalCode" TEXT NOT NULL,
    "receiverCity" TEXT NOT NULL,
    "receiverCountry" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL,
    "packages" INTEGER NOT NULL,
    "packageType" TEXT NOT NULL DEFAULT 'PK',
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "dispatchCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceHistory" (
    "id" TEXT NOT NULL,
    "clearanceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Clearance_tenantId_idx" ON "Clearance"("tenantId");

-- CreateIndex
CREATE INDEX "Clearance_tenantId_lrn_idx" ON "Clearance"("tenantId", "lrn");

-- CreateIndex
CREATE INDEX "Clearance_tenantId_status_idx" ON "Clearance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Clearance_companyId_idx" ON "Clearance"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Clearance_tenantId_lrn_key" ON "Clearance"("tenantId", "lrn");

-- CreateIndex
CREATE INDEX "Declaration_tenantId_idx" ON "Declaration"("tenantId");

-- CreateIndex
CREATE INDEX "Declaration_clearanceId_idx" ON "Declaration"("clearanceId");

-- CreateIndex
CREATE INDEX "Declaration_tenantId_lrn_idx" ON "Declaration"("tenantId", "lrn");

-- CreateIndex
CREATE UNIQUE INDEX "Declaration_tenantId_lrn_key" ON "Declaration"("tenantId", "lrn");

-- CreateIndex
CREATE INDEX "ExportDocument_declarationId_idx" ON "ExportDocument"("declarationId");

-- CreateIndex
CREATE INDEX "ExportDocument_mrnNumber_idx" ON "ExportDocument"("mrnNumber");

-- CreateIndex
CREATE INDEX "ClearanceHistory_clearanceId_idx" ON "ClearanceHistory"("clearanceId");

-- CreateIndex
CREATE INDEX "ClearanceHistory_userId_idx" ON "ClearanceHistory"("userId");

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_guaranteeId_fkey" FOREIGN KEY ("guaranteeId") REFERENCES "Guarantee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_goodsLocationId_fkey" FOREIGN KEY ("goodsLocationId") REFERENCES "GoodsLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "Authorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declaration" ADD CONSTRAINT "Declaration_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "Clearance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declaration" ADD CONSTRAINT "Declaration_destinationOfficeId_fkey" FOREIGN KEY ("destinationOfficeId") REFERENCES "CustomsOffice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportDocument" ADD CONSTRAINT "ExportDocument_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "Declaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceHistory" ADD CONSTRAINT "ClearanceHistory_clearanceId_fkey" FOREIGN KEY ("clearanceId") REFERENCES "Clearance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceHistory" ADD CONSTRAINT "ClearanceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
