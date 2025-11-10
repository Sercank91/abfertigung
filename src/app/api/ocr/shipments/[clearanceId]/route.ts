import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/ocr/shipments/[clearanceId]
 *
 * Gibt alle extrahierten Shipments für eine Clearance zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { clearanceId: string } }
) {
  try {
    const { clearanceId } = params;

    // Alle Shipments für diese Clearance laden
    const shipments = await db.shipment.findMany({
      where: { clearanceId },
      include: {
        positions: {
          orderBy: {
            orderNumber: 'asc',
          },
        },
        ocrDocument: {
          select: {
            id: true,
            fileName: true,
            status: true,
            processedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      clearanceId,
      shipments: shipments.map((shipment) => ({
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
        ocrDocument: shipment.ocrDocument,
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
          originCountry: pos.originCountry,
          destinationCountry: pos.destinationCountry,
          value: pos.value,
          currency: pos.currency,
          invoiceNumber: pos.invoiceNumber,
        })),
      })),
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
