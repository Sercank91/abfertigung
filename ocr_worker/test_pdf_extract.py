#!/usr/bin/env python
"""
Testet PDF-Text-Extraktion mit verschiedenen Methoden
"""

import sys
import pdfplumber
from PyPDF2 import PdfReader
import fitz  # PyMuPDF

pdf_path = r"D:\abfertigung\ocr_worker\uploads\5f46ef78-9066-4e3d-b6bb-11eeb60135bf.pdf"

print("=" * 60)
print("TEST 1: pdfplumber")
print("=" * 60)
try:
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Anzahl Seiten: {len(pdf.pages)}")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            print(f"\nSeite {i+1}:")
            print(f"  Text-Länge: {len(text) if text else 0} Zeichen")
            if text:
                print(f"  Erste 200 Zeichen: {text[:200]}")
except Exception as e:
    print(f"FEHLER: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST 2: PyPDF2")
print("=" * 60)
try:
    reader = PdfReader(pdf_path)
    print(f"Anzahl Seiten: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        print(f"\nSeite {i+1}:")
        print(f"  Text-Länge: {len(text) if text else 0} Zeichen")
        if text:
            print(f"  Erste 200 Zeichen: {text[:200]}")
except Exception as e:
    print(f"FEHLER: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST 3: PyMuPDF (fitz)")
print("=" * 60)
try:
    doc = fitz.open(pdf_path)
    print(f"Anzahl Seiten: {len(doc)}")
    for i in range(len(doc)):
        page = doc[i]
        text = page.get_text()
        print(f"\nSeite {i+1}:")
        print(f"  Text-Länge: {len(text) if text else 0} Zeichen")
        if text and len(text) > 10:
            print(f"  Erste 200 Zeichen: {text[:200]}")
    doc.close()
except Exception as e:
    print(f"FEHLER: {e}")
    import traceback
    traceback.print_exc()
