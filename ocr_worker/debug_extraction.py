#!/usr/bin/env python
"""
Debug-Skript für OCR-Extraktion
Testet verschiedene Ausfuhr-PDFs und zeigt detaillierte Debug-Informationen
"""

import sys
import os
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
import fitz  # PyMuPDF

from extractors_smart import (
    extract_mrn,
    extract_sender_smart,
    extract_receiver_smart,
    extract_hs_codes_smart,
    extract_total_gross_weight_smart,
    extract_total_packages,
    extract_positions_smart,
    extract_countries_smart,
    detect_document_type,
    classify_procedure_type_smart
)


def extract_text_from_pdf(file_path: str) -> str:
    """Extrahiert Text direkt aus PDF"""
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


def ocr_image(image: Image.Image) -> str:
    """Führt OCR auf einem Bild aus"""
    try:
        text = pytesseract.image_to_string(
            image,
            lang='deu+eng',
            config='--psm 6'
        )
        return text
    except Exception as e:
        print(f"⚠️ Tesseract OCR fehlgeschlagen: {e}")
        return ""


def process_pdf(pdf_path: str):
    """Verarbeitet eine PDF und zeigt Debug-Informationen"""

    print("="*80)
    print(f"🔍 DEBUG-EXTRAKTION: {os.path.basename(pdf_path)}")
    print("="*80)
    print()

    if not os.path.exists(pdf_path):
        print(f"❌ Datei nicht gefunden: {pdf_path}")
        return

    # 1. Text-Extraktion
    print("📄 SCHRITT 1: TEXT-EXTRAKTION")
    print("-"*80)

    full_text = ""

    # Versuche zuerst direkte PDF-Text-Extraktion
    if pdf_path.lower().endswith('.pdf'):
        print("Versuche direkte PDF-Text-Extraktion...")
        full_text = extract_text_from_pdf(pdf_path)

        if len(full_text.strip()) >= 100:
            print(f"✅ PDF-Text-Extraktion erfolgreich! ({len(full_text)} Zeichen)")
        else:
            print(f"⚠️ Zu wenig Text ({len(full_text)} Zeichen), verwende OCR...")
            full_text = ""

    # Falls PDF-Extraktion fehlschlug, verwende OCR
    if not full_text:
        print("Konvertiere PDF zu Bildern und führe OCR aus...")
        images = convert_from_path(pdf_path, dpi=300)
        print(f"  {len(images)} Seite(n) gefunden")

        all_text = []
        for i, image in enumerate(images):
            print(f"  OCR auf Seite {i + 1}/{len(images)}...")
            page_text = ocr_image(image)
            all_text.append(page_text)

        full_text = '\n\n=== NEUE SEITE ===\n\n'.join(all_text)
        print(f"✅ OCR abgeschlossen! ({len(full_text)} Zeichen)")

    # Debug-Output speichern
    debug_file = pdf_path.replace('.pdf', '_debug.txt')
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f"💾 Debug-Text gespeichert: {debug_file}")

    print("\n" + "="*80)
    print("📊 SCHRITT 2: DATEN-EXTRAKTION MIT DEBUG")
    print("="*80)
    print()

    # 2. MRN & Dokumenttyp
    print("🔖 BASIS-INFORMATIONEN:")
    print("-"*80)
    mrn = extract_mrn(full_text)
    print(f"MRN: {mrn or '❌ Nicht gefunden'}")

    document_type = detect_document_type(full_text)
    print(f"Dokumenttyp: {document_type}")

    origin_country, dest_country = extract_countries_smart(full_text)
    print(f"Länder: {origin_country or '?'} → {dest_country or '?'}")
    print()

    # 3. HS-Codes
    print("📦 HS-CODES:")
    print("-"*80)
    hs_codes = extract_hs_codes_smart(full_text)
    if hs_codes:
        print(f"✓ {len(hs_codes)} HS-Code(s) gefunden: {', '.join(hs_codes)}")
    else:
        print("❌ Keine HS-Codes gefunden")
    print()

    # 4. Adressen
    print("📮 ADRESSEN:")
    print("-"*80)
    sender = extract_sender_smart(full_text)
    if sender and sender.get('name'):
        print(f"✓ Absender:")
        print(f"   Name: {sender.get('name')}")
        print(f"   Straße: {sender.get('address') or '?'}")
        print(f"   PLZ/Stadt: {sender.get('zip') or '?'} {sender.get('city') or '?'}")
        print(f"   Land: {sender.get('country') or '?'}")
    else:
        print("❌ Absender nicht gefunden")

    print()
    receiver = extract_receiver_smart(full_text)
    if receiver and receiver.get('name'):
        print(f"✓ Empfänger:")
        print(f"   Name: {receiver.get('name')}")
        print(f"   Straße: {receiver.get('address') or '?'}")
        print(f"   PLZ/Stadt: {receiver.get('zip') or '?'} {receiver.get('city') or '?'}")
        print(f"   Land: {receiver.get('country') or '?'}")
    else:
        print("❌ Empfänger nicht gefunden")
    print()

    # 5. Totals
    print("📊 GESAMT-WERTE:")
    print("-"*80)
    total_gross_weight = extract_total_gross_weight_smart(full_text)
    print(f"Rohmasse: {total_gross_weight or '❌'} kg")

    total_packages = extract_total_packages(full_text)
    print(f"Packstücke: {total_packages or '❌'}")
    print()

    # 6. POSITIONEN (mit detailliertem Debug)
    print("="*80)
    print("📦 POSITIONEN (DETAILLIERT):")
    print("="*80)
    positions = extract_positions_smart(full_text, hs_codes, debug=True)

    # 7. Zusammenfassung
    print("\n" + "="*80)
    print("✅ ZUSAMMENFASSUNG")
    print("="*80)
    print(f"MRN: {mrn or '❌'}")
    print(f"Dokumenttyp: {document_type}")
    print(f"Positionen: {len(positions)}")
    print(f"Absender: {'✓' if sender and sender.get('name') else '❌'}")
    print(f"Empfänger: {'✓' if receiver and receiver.get('name') else '❌'}")
    print(f"Rohmasse: {total_gross_weight or '❌'} kg")
    print(f"Packstücke: {total_packages or '❌'}")
    print()

    if positions:
        print("Positions-Details:")
        for pos in positions:
            status = []
            if pos.get('description'):
                status.append("✓ Beschr.")
            else:
                status.append("❌ Beschr.")

            if pos.get('hsCode'):
                status.append(f"✓ HS:{pos['hsCode']}")
            else:
                status.append("❌ HS")

            if pos.get('netWeight') and pos['netWeight'] > 0:
                status.append(f"✓ {pos['netWeight']}kg")
            else:
                status.append("❌ Gewicht")

            if pos.get('procedure'):
                status.append(f"✓ {pos['procedure']}")
            else:
                status.append("❌ Verf.")

            print(f"  Pos {pos['orderNumber']}: {' | '.join(status)}")

    print("\n" + "="*80)
    print("✅ DEBUG-EXTRAKTION ABGESCHLOSSEN")
    print("="*80)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_extraction.py <pdf_file>")
        print()
        print("Beispiel:")
        print("  python debug_extraction.py /path/to/ausfuhr.pdf")
        sys.exit(1)

    pdf_path = sys.argv[1]
    process_pdf(pdf_path)
