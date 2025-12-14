import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * GET /api/ocr/status/[documentId]
 *
 * Gibt den Status eines OCR-Dokuments zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

    // OcrDocument aus Datenbank laden
    const docResult = await pool.query(
      'SELECT * FROM "OcrDocument" WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

    const ocrDocument = docResult.rows[0];

    // Shipments laden
    const shipmentsResult = await pool.query(
      'SELECT * FROM "Shipment" WHERE "ocrDocumentId" = $1',
      [documentId]
    );

    // Positionen für alle Shipments laden
    const shipments = await Promise.all(
      shipmentsResult.rows.map(async (shipment) => {
        const positionsResult = await pool.query(
          `SELECT * FROM "ShipmentPosition"
           WHERE "shipmentId" = $1
           ORDER BY "orderNumber" ASC`,
          [shipment.id]
        );

        return {
          id: shipment.id,
          mrn: shipment.mrn,
          documentType: shipment.documentType,
          procedureType: shipment.procedureType,
          commonSender: shipment.commonSender,
          commonReceiver: shipment.commonReceiver,
          totalPackages: shipment.totalPackages,
          totalGrossWeight: shipment.totalGrossWeight,
          totalNetWeight: shipment.totalNetWeight,
          totalValue: shipment.totalValue,
          currency: shipment.currency,
          invoiceNumbers: shipment.invoiceNumbers,
          verified: shipment.verified,
          positionCount: positionsResult.rows.length,
          positions: positionsResult.rows.map((pos) => ({
            id: pos.id,
            orderNumber: pos.orderNumber,
            hsCode: pos.hsCode,
            description: pos.description,
            netWeight: pos.netWeight,
            grossWeight: pos.grossWeight,
            procedure: pos.procedure,
            procedureType: pos.procedureType,
            sender: pos.sender,
            receiver: pos.receiver,
            value: pos.value,
            currency: pos.currency,
            invoiceNumber: pos.invoiceNumber,
          })),
        };
      })
    );

    return NextResponse.json({
      id: ocrDocument.id,
      fileName: ocrDocument.fileName,
      fileSize: ocrDocument.fileSize,
      fileType: ocrDocument.fileType,
      status: ocrDocument.status,
      progress: ocrDocument.progress,
      errorMessage: ocrDocument.errorMessage,
      processedAt: ocrDocument.processedAt,
      createdAt: ocrDocument.createdAt,
      updatedAt: ocrDocument.updatedAt,
      taskId: ocrDocument.ocrJobId,
      shipments,
    });
  } catch (error) {
    console.error('❌ Status-Abfrage Fehler:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
