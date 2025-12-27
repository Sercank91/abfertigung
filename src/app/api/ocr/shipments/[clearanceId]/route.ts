import { NextRequest, NextResponse } from 'next/server';
import { querySystem } from '@/lib/db';

/**
 * GET /api/ocr/shipments/[clearanceId]
 *
 * Gibt alle extrahierten Shipments für eine Clearance zurück
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clearanceId: string }> }
) {
  const params = await context.params;
  try {
    const { clearanceId } = params;

    // Alle Shipments für diese Clearance laden
    const shipmentsResult = await querySystem(
      `SELECT s.*,
         d.id as "ocrDocId", d."fileName" as "ocrDocFileName",
         d.status as "ocrDocStatus", d."processedAt" as "ocrDocProcessedAt"
       FROM "Shipment" s
       LEFT JOIN "OcrDocument" d ON d.id = s."ocrDocumentId"
       WHERE s."clearanceId" = $1
       ORDER BY s."createdAt" DESC`,
      [clearanceId]
    );

    // Positionen für alle Shipments laden
    const shipments = await Promise.all(
      shipmentsResult.rows.map(async (shipment) => {
        const positionsResult = await querySystem(
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
          commonOriginCountry: shipment.commonOriginCountry,
          commonDestCountry: shipment.commonDestCountry,
          totalPackages: shipment.totalPackages,
          totalGrossWeight: shipment.totalGrossWeight,
          totalNetWeight: shipment.totalNetWeight,
          totalValue: shipment.totalValue,
          currency: shipment.currency,
          invoiceNumbers: shipment.invoiceNumbers,
          verified: shipment.verified,
          createdAt: shipment.createdAt,
          updatedAt: shipment.updatedAt,
          ocrDocument: {
            id: shipment.ocrDocId,
            fileName: shipment.ocrDocFileName,
            status: shipment.ocrDocStatus,
            processedAt: shipment.ocrDocProcessedAt,
          },
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
            originCountry: pos.originCountry,
            destinationCountry: pos.destinationCountry,
            value: pos.value,
            currency: pos.currency,
            invoiceNumber: pos.invoiceNumber,
          })),
        };
      })
    );

    return NextResponse.json({
      clearanceId,
      shipments,
    });
  } catch (error) {
    console.error('❌ Shipments-Abfrage Fehler:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
