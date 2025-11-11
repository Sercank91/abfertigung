#!/usr/bin/env python
"""
Test-Skript für SEQUENZIELLE Extraktion
Testet die neue vereinfachte sequenzielle Logik
"""

import sys
import os

# Tesseract-Pfad konfigurieren (Windows)
if os.name == 'nt':
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from extractors_sequential import extract_positions_sequential


def test_with_debug_file(debug_file_path: str):
    """Testet Sequenzielle Extraktion mit existierender Debug-Datei"""

    print("="*80)
    print(f"🧪 TEST: SEQUENZIELLE EXTRAKTION")
    print(f"Datei: {os.path.basename(debug_file_path)}")
    print("="*80)
    print()

    if not os.path.exists(debug_file_path):
        print(f"❌ Datei nicht gefunden: {debug_file_path}")
        return

    # Text laden
    with open(debug_file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    print(f"📄 Text geladen: {len(text)} Zeichen")
    print()

    # Sequenzielle Extraktion ausführen
    positions = extract_positions_sequential(text, debug=True)

    # Zusammenfassung
    print("\n" + "="*80)
    print("✅ ZUSAMMENFASSUNG")
    print("="*80)
    print(f"Positionen gefunden: {len(positions)}")
    print()

    if positions:
        print("Details:")
        for pos in positions:
            status = []

            status.append(f"Pos {pos['orderNumber']}")

            if pos.get('description'):
                status.append(f"✓ Beschr: {pos['description'][:30]}...")
            else:
                status.append("❌ Beschr")

            if pos.get('hsCode'):
                status.append(f"✓ HS:{pos['hsCode']}")
            else:
                status.append("❌ HS")

            if pos.get('netWeight') and pos['netWeight'] > 0:
                status.append(f"✓ Netto:{pos['netWeight']}kg")
            else:
                status.append("❌ Netto")

            if pos.get('grossWeight') and pos['grossWeight'] > 0:
                status.append(f"✓ Brutto:{pos['grossWeight']}kg")
            else:
                status.append("❌ Brutto")

            if pos.get('procedure'):
                status.append(f"✓ Verf:{pos['procedure']}")
            else:
                status.append("❌ Verf")

            print(f"  {' | '.join(status)}")

    print("\n" + "="*80)
    print("✅ TEST ABGESCHLOSSEN")
    print("="*80)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_sequential.py <debug_text_file>")
        print()
        print("Beispiel:")
        print("  python test_sequential.py uploads/ausfuhr_fr_debug.txt")
        sys.exit(1)

    debug_file = sys.argv[1]
    test_with_debug_file(debug_file)
