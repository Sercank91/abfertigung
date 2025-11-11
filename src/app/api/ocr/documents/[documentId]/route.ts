import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * DELETE /api/ocr/documents/[documentId]
 *
 * Löscht ein OCR-Dokument und die zugehörige Datei
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

    // Dokument aus Datenbank abrufen, um Dateipfad zu bekommen
    const docResult = await pool.query(
      `SELECT "filePath" FROM "OcrDocument" WHERE id = $1`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dokument nicht gefunden' },
        { status: 404 }
      );
    }

    const filePath = docResult.rows[0].filePath;

    // Verknüpfte Shipments und Positionen löschen
    await pool.query(`DELETE FROM "ShipmentPosition" WHERE "shipmentId" IN (SELECT id FROM "Shipment" WHERE "ocrDocumentId" = $1)`, [documentId]);
    await pool.query(`DELETE FROM "Shipment" WHERE "ocrDocumentId" = $1`, [documentId]);

    // OcrDocument löschen
    await pool.query(`DELETE FROM "OcrDocument" WHERE id = $1`, [documentId]);

    // Datei löschen (falls vorhanden)
    if (filePath && existsSync(filePath)) {
      await unlink(filePath);
    }

    return NextResponse.json({
      success: true,
      message: 'Dokument erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
