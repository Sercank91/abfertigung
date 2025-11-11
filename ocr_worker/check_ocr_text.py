#!/usr/bin/env python
"""
Hilfsskript zum Anzeigen des extrahierten OCR-Texts
"""

import sys
import os
import psycopg2

DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/abfertigung'

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Neuestes Dokument mit OCR-Text holen
        cur.execute("""
            SELECT d.id, d."fileName", d.status, s."ocrText", s.mrn, s.id as shipment_id
            FROM "OcrDocument" d
            LEFT JOIN "Shipment" s ON s."ocrDocumentId" = d.id
            ORDER BY d."createdAt" DESC
            LIMIT 1
        """)

        row = cur.fetchone()

        if row:
            doc_id, file_name, status, ocr_text, mrn, shipment_id = row
            print(f"=== OCR Document ===")
            print(f"File: {file_name}")
            print(f"Status: {status}")
            print(f"MRN gefunden: {mrn or 'KEINE'}")
            print(f"Shipment ID: {shipment_id or 'KEINS'}")
            print()
            print("=== OCR TEXT (erste 3000 Zeichen) ===")
            if ocr_text:
                print(ocr_text[:3000])
            else:
                print("KEIN TEXT")
        else:
            print("Kein Dokument gefunden")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"Fehler: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
