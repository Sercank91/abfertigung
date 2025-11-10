-- AlterTable
ALTER TABLE "Clearance" ADD COLUMN "departureOfficeId" TEXT,
ADD COLUMN "dispatchOfficeId" TEXT,
ADD COLUMN "destinationOfficeId" TEXT;

-- CreateIndex
CREATE INDEX "Clearance_departureOfficeId_idx" ON "Clearance"("departureOfficeId");

-- CreateIndex
CREATE INDEX "Clearance_dispatchOfficeId_idx" ON "Clearance"("dispatchOfficeId");

-- CreateIndex
CREATE INDEX "Clearance_destinationOfficeId_idx" ON "Clearance"("destinationOfficeId");

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_departureOfficeId_fkey" FOREIGN KEY ("departureOfficeId") REFERENCES "CustomsOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_dispatchOfficeId_fkey" FOREIGN KEY ("dispatchOfficeId") REFERENCES "CustomsOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clearance" ADD CONSTRAINT "Clearance_destinationOfficeId_fkey" FOREIGN KEY ("destinationOfficeId") REFERENCES "CustomsOffice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
