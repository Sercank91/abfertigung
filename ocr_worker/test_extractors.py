#!/usr/bin/env python
"""
Testet die neuen feldnummernbasierten Extraktoren
"""

import os
from extractors_new import (
    extract_mrn,
    extract_sender,
    extract_receiver,
    extract_total_packages,
    extract_total_gross_weight,
    extract_origin_country,
    extract_destination_country,
    extract_page_count,
    extract_hs_codes,
    extract_procedure_codes,
    classify_procedure_type,
    detect_document_type,
    parse_positions_table
)

# Lade den OCR-Debug-Text
debug_file = r"D:\abfertigung\ocr_worker\uploads\ocr_debug_157d2770-e334-4292-b3d2-295f18abcd3f.txt"

if os.path.exists(debug_file):
    with open(debug_file, 'r', encoding='utf-8') as f:
        ocr_text = f.read()
else:
    print(f"❌ Debug-Datei nicht gefunden: {debug_file}")
    exit(1)

print("=" * 70)
print("TEST: Feldnummernbasierte Extraktoren")
print("=" * 70)

print("\n📄 OCR-Text Länge:", len(ocr_text), "Zeichen")
print("📄 Erste 500 Zeichen:")
print(ocr_text[:500])

print("\n" + "=" * 70)
print("EXTRAKTION:")
print("=" * 70)

# MRN
mrn = extract_mrn(ocr_text)
print(f"\n✅ MRN: {mrn}")

# Dokumenttyp
doc_type = detect_document_type(ocr_text)
print(f"✅ Dokumenttyp: {doc_type}")

# Versender (2)
sender = extract_sender(ocr_text)
print(f"\n✅ Versender (2):")
if sender:
    for key, value in sender.items():
        print(f"   {key}: {value}")
else:
    print("   ❌ Nicht gefunden")

# Empfänger (8)
receiver = extract_receiver(ocr_text)
print(f"\n✅ Empfänger (8):")
if receiver:
    for key, value in receiver.items():
        print(f"   {key}: {value}")
else:
    print("   ❌ Nicht gefunden")

# Vordrucke (3)
pages = extract_page_count(ocr_text)
print(f"\n✅ Vordrucke (3): {pages}")

# Packstücke (6)
packages = extract_total_packages(ocr_text)
print(f"✅ Packstücke insgesamt (6): {packages}")

# Versendungsland (15)
origin = extract_origin_country(ocr_text)
print(f"✅ Versendungsland (15): {origin}")

# Bestimmungsland (17)
destination = extract_destination_country(ocr_text)
print(f"✅ Bestimmungsland (17): {destination}")

# Rohmasse (35)
gross_weight = extract_total_gross_weight(ocr_text)
print(f"✅ Rohmasse kg (35): {gross_weight}")

# HS-Codes
hs_codes = extract_hs_codes(ocr_text)
print(f"\n✅ HS-Codes gefunden: {len(hs_codes)}")
for hs in hs_codes[:10]:  # Zeige nur erste 10
    print(f"   - {hs}")

# Procedure Codes
procedures = extract_procedure_codes(ocr_text)
print(f"\n✅ Procedure Codes: {procedures}")
proc_type = classify_procedure_type(procedures)
print(f"✅ Procedure Type: {proc_type}")

# Positionen
positions = parse_positions_table(ocr_text)
print(f"\n✅ Positionen gefunden: {len(positions)}")
for i, pos in enumerate(positions, 1):
    print(f"\n   Position {i}:")
    print(f"      HS-Code: {pos['hsCode']}")
    print(f"      Beschreibung: {pos['description'][:50]}..." if pos['description'] else "      Beschreibung: -")
    print(f"      Gewicht: {pos['netWeight']} kg")
    print(f"      Procedure: {pos.get('procedure', '-')}")

print("\n" + "=" * 70)
print("TEST ABGESCHLOSSEN")
print("=" * 70)
