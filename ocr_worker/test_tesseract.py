#!/usr/bin/env python
"""
Testet Tesseract OCR auf dem ersten Seiten-Bild
"""

import sys
from pdf2image import convert_from_path
import pytesseract
from PIL import Image

pdf_path = r"D:\abfertigung\ocr_worker\uploads\5f46ef78-9066-4e3d-b6bb-11eeb60135bf.pdf"

print("=" * 60)
print("Tesseract OCR Test")
print("=" * 60)

# PDF zu Bildern konvertieren
print("\n1. Konvertiere PDF zu Bildern...")
images = convert_from_path(pdf_path)
print(f"   ✅ {len(images)} Seiten konvertiert")

# Teste nur die erste Seite
if images:
    print("\n2. Teste OCR auf Seite 1...")
    image = images[0]

    # Test 1: Deutsch
    print("\n   Test 1: Tesseract mit Deutsch (deu)")
    try:
        text_de = pytesseract.image_to_string(image, lang='deu')
        print(f"   Länge: {len(text_de)} Zeichen")
        if len(text_de) > 100:
            print(f"   Erste 500 Zeichen:\n{text_de[:500]}")
        else:
            print(f"   Text: {text_de}")
    except Exception as e:
        print(f"   FEHLER: {e}")

    # Test 2: Englisch
    print("\n   Test 2: Tesseract mit Englisch (eng)")
    try:
        text_en = pytesseract.image_to_string(image, lang='eng')
        print(f"   Länge: {len(text_en)} Zeichen")
        if len(text_en) > 100:
            print(f"   Erste 500 Zeichen:\n{text_en[:500]}")
        else:
            print(f"   Text: {text_en}")
    except Exception as e:
        print(f"   FEHLER: {e}")

    # Test 3: Mit PSM-Modus (Page Segmentation Mode)
    print("\n   Test 3: Tesseract mit PSM=6 (Uniform text block)")
    try:
        custom_config = r'--oem 3 --psm 6'
        text_psm = pytesseract.image_to_string(image, lang='deu', config=custom_config)
        print(f"   Länge: {len(text_psm)} Zeichen")
        if len(text_psm) > 100:
            print(f"   Erste 500 Zeichen:\n{text_psm[:500]}")
        else:
            print(f"   Text: {text_psm}")
    except Exception as e:
        print(f"   FEHLER: {e}")

print("\n" + "=" * 60)
print("Tesseract-Pfad:", pytesseract.pytesseract.tesseract_cmd)
print("=" * 60)
