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
            COUNT(p.id) as "positionCount"
          FROM "Shipment" s
          LEFT JOIN "ShipmentPosition" p ON p."shipmentId" = s.id
          WHERE s."ocrDocumentId" = $1
          GROUP BY s.id`,
          [doc.id]
        );

        return {
          ...doc,
          shipmentCount: shipmentsResult.rows.length,
          shipments: shipmentsResult.rows.map((s) => ({
            ...s,
            positionCount: parseInt(s.positionCount, 10),
          })),
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
