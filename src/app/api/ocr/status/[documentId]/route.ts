import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const ocrDocument = await prisma.ocrDocument.findUnique({
      where: { id: documentId },
      include: {
        shipments: {
          include: {
            positions: {
              orderBy: {
                orderNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!ocrDocument) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

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
      shipments: ocrDocument.shipments.map((shipment) => ({
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
        positionCount: shipment.positions.length,
        positions: shipment.positions.map((pos) => ({
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
      })),
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
