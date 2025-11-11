import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * GET /api/ocr/documents/[clearanceId]
 *
 * Gibt alle OCR-Dokumente für eine Clearance zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clearanceId: string } }
) {
  try {
    const { clearanceId } = params;

    // Alle OCR-Dokumente für diese Clearance laden
    const documentsResult = await pool.query(
      `SELECT
        d.id, d."fileName", d."fileSize", d."fileType", d.status,
        d.progress, d."errorMessage", d."ocrJobId" as "taskId",
        d."processedAt", d."createdAt", d."updatedAt"
      FROM "OcrDocument" d
      WHERE d."clearanceId" = $1
      ORDER BY d."createdAt" DESC`,
      [clearanceId]
    );

    // Für jedes Dokument die Shipments laden
    const documents = await Promise.all(
      documentsResult.rows.map(async (doc) => {
        const shipmentsResult = await pool.query(
          `SELECT
            s.id, s.mrn, s."documentType", s."procedureType", s.verified,
            s."commonSender", s."commonReceiver",
            s."commonOriginCountry", s."commonDestCountry",
            s."totalPackages", s."totalGrossWeight", s."totalNetWeight",
            s."totalValue", s.currency
          FROM "Shipment" s
          WHERE s."ocrDocumentId" = $1
          ORDER BY s."createdAt" ASC`,
          [doc.id]
        );

        // Für jedes Shipment die Positionen laden
        const shipments = await Promise.all(
          shipmentsResult.rows.map(async (shipment) => {
            const positionsResult = await pool.query(
              `SELECT
                p.id, p."orderNumber", p."hsCode", p.description,
                p."netWeight", p."grossWeight", p.procedure, p."procedureType",
                p.value, p.currency, p."invoiceNumber"
              FROM "ShipmentPosition" p
              WHERE p."shipmentId" = $1
              ORDER BY p."orderNumber" ASC`,
              [shipment.id]
            );

            return {
              ...shipment,
              positionCount: positionsResult.rows.length,
              positions: positionsResult.rows,
            };
          })
        );

        return {
          ...doc,
          shipmentCount: shipmentsResult.rows.length,
          shipments,
        };
      })
    );

    return NextResponse.json({
      clearanceId,
      documents,
    });
  } catch (error) {
    console.error('❌ Dokumente-Abfrage Fehler:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
