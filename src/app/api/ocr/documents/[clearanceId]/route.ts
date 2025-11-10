import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const documents = await db.ocrDocument.findMany({
      where: { clearanceId },
      include: {
        shipments: {
          select: {
            id: true,
            mrn: true,
            documentType: true,
            procedureType: true,
            verified: true,
            _count: {
              select: {
                positions: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      clearanceId,
      documents: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        status: doc.status,
        progress: doc.progress,
        errorMessage: doc.errorMessage,
        taskId: doc.ocrJobId,
        processedAt: doc.processedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        shipmentCount: doc.shipments.length,
        shipments: doc.shipments.map((shipment) => ({
          id: shipment.id,
          mrn: shipment.mrn,
          documentType: shipment.documentType,
          procedureType: shipment.procedureType,
          verified: shipment.verified,
          positionCount: shipment._count.positions,
        })),
      })),
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
