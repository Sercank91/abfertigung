-- CreateTable
CREATE TABLE "CustomsOffice" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomsOffice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" TEXT[],
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTransitOffice" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "customsOfficeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTransitOffice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomsOffice_code_key" ON "CustomsOffice"("code");

-- CreateIndex
CREATE INDEX "CustomsOffice_countryCode_idx" ON "CustomsOffice"("countryCode");

-- CreateIndex
CREATE INDEX "CustomsOffice_code_idx" ON "CustomsOffice"("code");

-- CreateIndex
CREATE INDEX "Route_tenantId_idx" ON "Route"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_tenantId_name_key" ON "Route"("tenantId", "name");

-- CreateIndex
CREATE INDEX "RouteTransitOffice_routeId_idx" ON "RouteTransitOffice"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteTransitOffice_routeId_customsOfficeId_key" ON "RouteTransitOffice"("routeId", "customsOfficeId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTransitOffice" ADD CONSTRAINT "RouteTransitOffice_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTransitOffice" ADD CONSTRAINT "RouteTransitOffice_customsOfficeId_fkey" FOREIGN KEY ("customsOfficeId") REFERENCES "CustomsOffice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
