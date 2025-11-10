"""
Test Script für OCR Worker
Erstellt ein Test-Dokument und verarbeitet es
"""

import os
from worker import process_ocr_document

def test_worker():
    """Testet den OCR Worker mit einem Beispiel"""

    print("="*60)
    print("OCR Worker Test")
    print("="*60)

    # Test-Parameter
    test_doc_id = "test_doc_123"
    test_clearance_id = "test_clearance_456"

    # Test-Datei (muss existieren!)
    # Du kannst hier den Pfad zu einem echten PDF ändern
    test_file = "test_document.pdf"

    if not os.path.exists(test_file):
        print("\n❌ Test-Datei nicht gefunden!")
        print(f"   Bitte erstelle eine Datei: {test_file}")
        print("   Oder ändere den Pfad in test_worker.py")
        return

    print(f"\n📄 Test-Datei: {test_file}")
    print(f"📝 Document ID: {test_doc_id}")
    print(f"📦 Clearance ID: {test_clearance_id}")
    print("\n⏳ Sende Job an Celery...")

    # Job an Celery senden
    result = process_ocr_document.delay(
        test_doc_id,
        test_file,
        test_clearance_id
    )

    print(f"\n✅ Job gesendet!")
    print(f"   Task ID: {result.id}")
    print(f"   Status: {result.status}")

    print("\n⏳ Warte auf Ergebnis...")
    print("   (Dies kann 10-30 Sekunden dauern...)")

    try:
        # Warte max 60 Sekunden auf Ergebnis
        result_data = result.get(timeout=60)

        print("\n" + "="*60)
        print("✅ ERFOLG!")
        print("="*60)
        print(f"\nShipment ID: {result_data.get('shipment_id')}")
        print(f"\nExtrahierte Daten:")
        print(f"  - MRN: {result_data['extracted_data'].get('mrn', 'N/A')}")
        print(f"  - Typ: {result_data['extracted_data'].get('documentType', 'N/A')}")
        print(f"  - Procedure: {result_data['extracted_data'].get('procedureType', 'N/A')}")
        print(f"  - Positionen: {len(result_data['extracted_data'].get('positions', []))}")
        print("\n" + "="*60)

    except Exception as e:
        print(f"\n❌ FEHLER: {e}")
        print("\nMögliche Ursachen:")
        print("  1. Worker läuft nicht (starte: celery -A worker worker)")
        print("  2. Redis läuft nicht (teste: redis-cli ping)")
        print("  3. PostgreSQL nicht erreichbar")
        print("  4. Datei kann nicht verarbeitet werden")


if __name__ == '__main__':
    test_worker()
