#!/usr/bin/env python
"""
Testet die SMARTEN Extraktoren
"""

import os
from extractors_smart import (
    extract_mrn,
    extract_sender_smart,
    extract_receiver_smart,
    extract_hs_codes_smart,
    extract_positions_smart,
    extract_total_gross_weight_smart,
    extract_total_packages,
    extract_countries_smart,
    detect_document_type,
    classify_procedure_type_smart
)

# Lade OCR-Debug-Text
debug_file = r"D:\abfertigung\ocr_worker\uploads\ocr_debug_157d2770-e334-4292-b3d2-295f18abcd3f.txt"

if os.path.exists(debug_file):
    with open(debug_file, 'r', encoding='utf-8') as f:
        ocr_text = f.read()
else:
    print(f"❌ Debug-Datei nicht gefunden: {debug_file}")
    exit(1)

print("=" * 80)
print("🧠 TEST: SMARTE EXTRAKTOREN")
print("=" * 80)

print(f"\n📄 OCR-Text Länge: {len(ocr_text)} Zeichen")

print("\n" + "=" * 80)
print("📋 EXTRAKTION:")
print("=" * 80)

# 1. MRN
print("\n🎯 MRN:")
mrn = extract_mrn(ocr_text)
print(f"   ✅ {mrn}")

# 2. Dokumenttyp
print("\n📄 Dokumenttyp:")
doc_type = detect_document_type(ocr_text)
print(f"   ✅ {doc_type}")

# 3. Versender
print("\n📤 Versender:")
sender = extract_sender_smart(ocr_text)
if sender:
    print(f"   Name:    {sender['name']}")
    print(f"   Straße:  {sender['address']}")
    print(f"   PLZ:     {sender['zip']}")
    print(f"   Stadt:   {sender['city']}")
    print(f"   Land:    {sender['country']}")
else:
    print("   ❌ Nicht gefunden")

# 4. Empfänger
print("\n📥 Empfänger:")
receiver = extract_receiver_smart(ocr_text)
if receiver:
    print(f"   Name:    {receiver['name']}")
    print(f"   Straße:  {receiver['address']}")
    print(f"   PLZ:     {receiver['zip']}")
    print(f"   Stadt:   {receiver['city']}")
    print(f"   Land:    {receiver['country']}")
else:
    print("   ❌ Nicht gefunden")

# 5. Länder
print("\n🌍 Länder:")
origin, destination = extract_countries_smart(ocr_text)
print(f"   Versendungsland:   {origin}")
print(f"   Bestimmungsland:   {destination}")

# 6. Gewicht
print("\n⚖️  Rohmasse:")
gross_weight = extract_total_gross_weight_smart(ocr_text)
print(f"   ✅ {gross_weight} kg")

# 7. Packstücke
print("\n📦 Packstücke:")
packages = extract_total_packages(ocr_text)
print(f"   ✅ {packages}")

# 8. HS-Codes
print("\n🔢 HS-Codes:")
hs_codes = extract_hs_codes_smart(ocr_text)
print(f"   Gefunden: {len(hs_codes)}")
for hs in hs_codes:
    print(f"   ✅ {hs}")

# 9. Positionen
print("\n📊 Positionen:")
positions = extract_positions_smart(ocr_text, hs_codes)
print(f"   Gefunden: {len(positions)}\n")

for i, pos in enumerate(positions, 1):
    print(f"   Position {i}:")
    print(f"      HS-Code:      {pos['hsCode']}")
    print(f"      Beschreibung: {pos['description'][:60]}..." if pos['description'] else "      Beschreibung: -")
    print(f"      Gewicht:      {pos['netWeight']} kg")
    print(f"      Procedure:    {pos.get('procedure', '-')} ({pos.get('procedureType', '-')})")
    print()

# 10. Verfahrenstyp
print("🔄 Verfahrenstyp:")
proc_type = classify_procedure_type_smart(positions)
print(f"   ✅ {proc_type}")

print("\n" + "=" * 80)
print("✅ TEST ABGESCHLOSSEN - ALLE DATEN EXTRAHIERT!")
print("=" * 80)
