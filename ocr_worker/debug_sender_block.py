#!/usr/bin/env python
"""
Debug: Zeigt den [1] Block und was extrahiert wird
"""
import sys
import re

if len(sys.argv) < 2:
    print("Usage: python debug_sender_block.py <debug-text-file>")
    sys.exit(1)

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    text = f.read()

print("="*80)
print("DEBUG: SENDER [1] BLOCK")
print("="*80)

# Suche nach [1]
match = re.search(r'\[1\]\s*([A-ZÄÖÜ])', text)
if match:
    start = match.start()
    block = text[start:start+600]

    print(f"\n✅ [1] gefunden an Position {start}")
    print(f"\nBlock (600 Zeichen ab [1]):")
    print("-"*80)
    print(block)
    print("-"*80)

    # Zeige Zeilen
    lines = block.split('\n')
    print(f"\n📋 Zeilen im Block ({len(lines)}):")
    for i, line in enumerate(lines[:15], 1):
        print(f"  {i:2}. |{line}|")

    # Suche nach PLZ Pattern
    print("\n🔍 PLZ-Suche:")
    print(f"\nKombinierter Block: '{' '.join([l.strip() for l in lines if l.strip()])}'")

    # Pattern aus Code
    full_block = ' '.join([l.strip() for l in lines if l.strip()])
    zip_city_match = re.search(r'\b([59]\d{4})\s+([A-Za-zäöüÄÖÜß][\w\-\s]+?)(?:\s+[A-Z]{2}\b|$)', full_block)

    if zip_city_match:
        print(f"  ✅ Match gefunden:")
        print(f"     PLZ: {zip_city_match.group(1)}")
        print(f"     Stadt: {zip_city_match.group(2)}")
    else:
        print("  ❌ Kein Match mit Pattern: r'\\b([59]\\d{4})\\s+([A-Za-zäöüÄÖÜß][\\w\\-\\s]+?)(?:\\s+[A-Z]{2}\\b|$)'")

        # Versuche alle 5-stelligen Zahlen zu finden
        all_5digit = re.findall(r'\b(\d{5})\b', full_block)
        print(f"\n  Alle 5-stelligen Zahlen: {all_5digit}")

        # Versuche alle Städtenamen zu finden
        cities = re.findall(r'\b([A-Z][a-zäöü]+(?:-[A-Z][a-zäöü]+)?)\b', full_block)
        print(f"  Potentielle Städtenamen: {cities}")

else:
    print("\n❌ [1] Marker nicht gefunden!")

    # Suche nach (2)
    match2 = re.search(r'\(2\)', text)
    if match2:
        print(f"\n✅ (2) gefunden an Position {match2.start()}")
        block = text[match2.start():match2.start()+400]
        print("\nBlock (400 Zeichen ab (2)):")
        print("-"*80)
        print(block)
        print("-"*80)

print("\n" + "="*80)
