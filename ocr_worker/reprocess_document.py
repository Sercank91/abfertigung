#!/usr/bin/env python
"""
Verarbeitet ein vorhandenes OCR-Dokument neu
"""

import sys
import psycopg2

DATABASE_URL = 'postgresql://postgres:Manisali45!*@localhost:5432/abfertigung?client_encoding=utf8'

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Neuestes Dokument holen
        cur.execute("""
            SELECT d.id, d."filePath", d."clearanceId"
            FROM "OcrDocument" d
            ORDER BY d."createdAt" DESC
            LIMIT 1
        """)

        row = cur.fetchone()

        if row:
            doc_id, file_path, clearance_id = row
            print(f"=== Verarbeite Dokument neu ===")
            print(f"Document ID: {doc_id}")
            print(f"File Path: {file_path}")
            print(f"Clearance ID: {clearance_id}")
            print()

            # Shipments löschen (damit wir neu extrahieren können)
            cur.execute('DELETE FROM "ShipmentPosition" WHERE "shipmentId" IN (SELECT id FROM "Shipment" WHERE "ocrDocumentId" = %s)', (doc_id,))
            cur.execute('DELETE FROM "Shipment" WHERE "ocrDocumentId" = %s', (doc_id,))
            conn.commit()

            cur.close()
            conn.close()

            # Neu verarbeiten - direkt den Worker aufrufen
            print("Starte Neuverarbeitung...")
            from worker import process_ocr_document

            # Synchrone Ausführung (nicht über Celery)
            result = process_ocr_document(doc_id, file_path, clearance_id)
            print("\n✅ Fertig!")

        else:
            print("Kein Dokument gefunden")
            cur.close()
            conn.close()

    except Exception as e:
        print(f"Fehler: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
