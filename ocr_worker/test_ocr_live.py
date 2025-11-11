#!/usr/bin/env python
"""
Live OCR Test - Zeigt rohen OCR-Text und extrahierte Daten
"""
import sys
import os
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
import fitz  # PyMuPDF

# Tesseract konfigurieren
if os.name == 'nt':  # Windows
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from extractors_smart import (
    extract_mrn,
    extract_sender_smart,
    extract_receiver_smart,
    extract_hs_codes_smart,
    extract_total_gross_weight_smart,
    extract_total_packages,
    extract_positions_smart,
    extract_countries_smart,
    detect_document_type
)

def extract_text_from_pdf(file_path: str) -> str:
    """Extrahiert Text aus PDF"""
    try:
        all_text = []
        doc = fitz.open(file_path)

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text and len(text.strip()) > 0:
                all_text.append(text)

        doc.close()
        return '\n\n=== NEUE SEITE ===\n\n'.join(all_text)
    except Exception as e:
        print(f"⚠️ PDF-Text-Extraktion fehlgeschlagen: {e}")
        return ""

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_ocr_live.py <pdf-datei>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):
        print(f"❌ Datei nicht gefunden: {pdf_path}")
        sys.exit(1)

    print("="*80)
    print("🔍 OCR LIVE TEST")
    print("="*80)
    print(f"Datei: {pdf_path}\n")

    # 1. Text extrahieren
    print("📄 Extrahiere Text aus PDF...")
    text = extract_text_from_pdf(pdf_path)

    if not text or len(text.strip()) < 100:
        print("⚠️ Zu wenig Text extrahiert, versuche OCR...")
        # TODO: OCR fallback

    # 2. Zeige ersten Teil des rohen Textes
    print("\n" + "="*80)
    print("📝 ROHER OCR-TEXT (erste 2000 Zeichen):")
    print("="*80)
    print(text[:2000])
    print("...")

    # 3. Suche nach Codes
    print("\n" + "="*80)
    print("🔍 SUCHE NACH CODES:")
    print("="*80)

    codes_to_find = ['(2)', '(8)', '(3)', '(6)', '(15)', '(17)', '(35)', '(31)', '(33)']
    for code in codes_to_find:
        if code in text:
            print(f"✅ Code {code} GEFUNDEN")
            # Zeige Kontext
            idx = text.find(code)
            context = text[max(0, idx-50):min(len(text), idx+200)]
            print(f"   Kontext: ...{context}...")
        else:
            print(f"❌ Code {code} NICHT gefunden")

    # 4. Extrahiere Daten
    print("\n" + "="*80)
    print("📊 EXTRAHIERTE DATEN:")
    print("="*80)

    mrn = extract_mrn(text)
    print(f"MRN: {mrn}")

    doc_type = detect_document_type(text)
    print(f"Dokumenttyp: {doc_type}")

    sender = extract_sender_smart(text)
    print(f"\nAbsender (Code 2):")
    if sender:
        print(f"  Name: {sender.get('name')}")
        print(f"  Adresse: {sender.get('address')}")
        print(f"  PLZ: {sender.get('zip')}")
        print(f"  Stadt: {sender.get('city')}")
        print(f"  Land: {sender.get('country')}")
    else:
        print("  ❌ Nicht gefunden")

    receiver = extract_receiver_smart(text)
    print(f"\nEmpfänger (Code 8):")
    if receiver:
        print(f"  Name: {receiver.get('name')}")
        print(f"  Adresse: {receiver.get('address')}")
        print(f"  PLZ: {receiver.get('zip')}")
        print(f"  Stadt: {receiver.get('city')}")
        print(f"  Land: {receiver.get('country')}")
    else:
        print("  ❌ Nicht gefunden")

    origin, dest = extract_countries_smart(text)
    print(f"\nLänder (Codes 15 & 17):")
    print(f"  Versendung: {origin}")
    print(f"  Bestimmung: {dest}")

    gross_weight = extract_total_gross_weight_smart(text)
    print(f"\nRohmasse (Code 35): {gross_weight} kg")

    packages = extract_total_packages(text)
    print(f"Packstücke (Code 6): {packages}")

    hs_codes = extract_hs_codes_smart(text)
    print(f"\nHS-Codes gefunden: {len(hs_codes)}")
    print(f"  {hs_codes}")

    positions = extract_positions_smart(text, hs_codes)
    print(f"\nPositionen: {len(positions)}")
    for pos in positions[:3]:  # Zeige erste 3
        print(f"  Pos {pos.get('orderNumber')}: {pos.get('hsCode')} - {pos.get('description')[:50] if pos.get('description') else 'N/A'}")

    print("\n" + "="*80)
    print("✅ TEST ABGESCHLOSSEN")
    print("="*80)

if __name__ == '__main__':
    main()
