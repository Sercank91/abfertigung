#!/usr/bin/env python3
"""
Test-Script: Universelle Code-basierte Extraktion direkt von PDF mit OCR
"""
import sys
import os
from pdf2image import convert_from_path
import pytesseract
from extractors_code_based import extract_positions_code_based


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extrahiert Text aus PDF mit OCR (für gescannte PDFs)"""
    print("   Konvertiere PDF zu Bildern...")
    images = convert_from_path(pdf_path, dpi=300)

    print(f"   {len(images)} Seiten gefunden")
    print("   Fuehre OCR durch...")

    text = ""
    for i, image in enumerate(images, 1):
        print(f"   - Seite {i}...", end=" ")
        page_text = pytesseract.image_to_string(image, lang='deu+fra+eng')
        text += f"\n--- SEITE {i} ---\n{page_text}\n"
        print(f"{len(page_text)} Zeichen")

    return text


def test_pdf(pdf_path: str):
    print("="*80)
    print(f"TEST: UNIVERSELLE CODE-BASIERTE EXTRAKTION")
    print(f"Datei: {pdf_path}")
    print("="*80)

    if not os.path.exists(pdf_path):
        print(f"Fehler: Datei nicht gefunden: {pdf_path}")
        return

    # Text extrahieren
    print("\n1. Text-Extraktion...")
    text = extract_text_from_pdf(pdf_path)
    print(f"   Text geladen: {len(text)} Zeichen")

    # Code-basierte Positions-Extraktion
    print("\n2. Positions-Extraktion...")
    positions = extract_positions_code_based(text, debug=True)

    # Zusammenfassung
    print("\n" + "="*80)
    print("ZUSAMMENFASSUNG")
    print("="*80)
    print(f"Positionen gefunden: {len(positions)}\n")

    if positions:
        for pos in positions:
            print(f"  Pos {pos['orderNumber']} | "
                  f"HS:{pos.get('hsCode', '?')} | "
                  f"Netto:{pos.get('netWeight', 0)}kg | "
                  f"Brutto:{pos.get('grossWeight', 0)}kg | "
                  f"Verf:{pos.get('procedure', '?')}")

    print("\n" + "="*80)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_pdf_universal.py <pdf_file>")
        print("\nBeispiel:")
        print("  python test_pdf_universal.py uploads/ausfuhr_de.pdf")
        print("  python test_pdf_universal.py uploads/ausfuhr_fr.pdf")
        sys.exit(1)

    test_pdf(sys.argv[1])
