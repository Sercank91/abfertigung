-- Manual Migration: Add OCR Tables
-- This migration adds the three new OCR tables without affecting existing data
-- Run this with: psql -U your_user -d abfertigung -f migrations/manual_add_ocr_tables.sql

-- ============================================
-- 1. OcrDocument Table
-- ============================================
CREATE TABLE IF NOT EXISTS "OcrDocument" (
    "id" TEXT NOT NULL,
    "clearanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileData" BYTEA,
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ocrJobId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrDocument_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 2. Shipment Table
-- ============================================
CREATE TABLE IF NOT EXISTS "Shipment" (
    "id" TEXT NOT NULL,
    "ocrDocumentId" TEXT NOT NULL,
    "clearanceId" TEXT NOT NULL,
    "declarationId" TEXT,
    "mrn" TEXT,
    "documentType" TEXT,
    "procedureType" TEXT,
    "commonSender" JSONB,
    "commonReceiver" JSONB,
    "commonOriginCountry" TEXT,
    "commonDestCountry" TEXT,
    "totalPackages" INTEGER,
    "totalGrossWeight" DOUBLE PRECISION,
    "totalNetWeight" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION,
    "currency" TEXT,
    "invoiceNumbers" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 3. ShipmentPosition Table
-- ============================================
CREATE TABLE IF NOT EXISTS "ShipmentPosition" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "hsCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "netWeight" DOUBLE PRECISION NOT NULL,
    "grossWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "procedure" TEXT,
    "procedureType" TEXT,
    "sender" JSONB,
    "receiver" JSONB,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT,
    "invoiceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPosition_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- 4. Foreign Keys
-- ============================================
ALTER TABLE "Shipment"
ADD CONSTRAINT "Shipment_ocrDocumentId_fkey"
FOREIGN KEY ("ocrDocumentId")
REFERENCES "OcrDocument"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShipmentPosition"
ADD CONSTRAINT "ShipmentPosition_shipmentId_fkey"
FOREIGN KEY ("shipmentId")
REFERENCES "Shipment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 5. Indexes
-- ============================================

-- OcrDocument indexes
CREATE INDEX IF NOT EXISTS "OcrDocument_clearanceId_idx" ON "OcrDocument"("clearanceId");
CREATE INDEX IF NOT EXISTS "OcrDocument_status_idx" ON "OcrDocument"("status");
CREATE INDEX IF NOT EXISTS "OcrDocument_ocrJobId_idx" ON "OcrDocument"("ocrJobId");

-- Shipment indexes
CREATE INDEX IF NOT EXISTS "Shipment_ocrDocumentId_idx" ON "Shipment"("ocrDocumentId");
CREATE INDEX IF NOT EXISTS "Shipment_clearanceId_idx" ON "Shipment"("clearanceId");
CREATE INDEX IF NOT EXISTS "Shipment_declarationId_idx" ON "Shipment"("declarationId");
CREATE INDEX IF NOT EXISTS "Shipment_mrn_idx" ON "Shipment"("mrn");

-- ShipmentPosition indexes
CREATE INDEX IF NOT EXISTS "ShipmentPosition_shipmentId_idx" ON "ShipmentPosition"("shipmentId");
CREATE INDEX IF NOT EXISTS "ShipmentPosition_hsCode_idx" ON "ShipmentPosition"("hsCode");

-- ShipmentPosition unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "ShipmentPosition_shipmentId_orderNumber_key"
ON "ShipmentPosition"("shipmentId", "orderNumber");

-- ============================================
-- Migration complete!
-- ============================================
