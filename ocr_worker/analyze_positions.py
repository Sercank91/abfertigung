#!/usr/bin/env python
"""
Analysiert die Positions-Struktur im OCR-Text
"""
import re
import os

# Lese den OCR Text
debug_file = os.path.join(os.path.dirname(__file__), "uploads", "ocr_debug_test.txt")

if not os.path.exists(debug_file):
    print(f"❌ Datei nicht gefunden: {debug_file}")
    exit(1)

with open(debug_file, 'r', encoding='utf-8') as f:
    text = f.read()

print('='*80)
print('POSITIONS-ANALYSE: (31), (38), (37)')
print('='*80)

# Suche nach (31) - Warenbezeichnung
print('\n1. WARENBEZEICHNUNG (31):')
pattern31 = r'\(31[^)]*\)[^\n]*\n([^\n]+(?:\n[^\n]+){0,3})'
matches31 = re.findall(pattern31, text)
for i, match in enumerate(matches31[:3], 1):
    print(f'\n   Match {i}:')
    print(f'   {match[:200]}...')

# Suche nach (38) - Eigenmasse/Nettogewicht
print('\n\n2. EIGENMASSE/NETTOGEWICHT (38):')
pattern38 = r'\(38\)[^\n]*\n([^\n]+(?:\n[^\n]+){0,2})'
matches38 = re.findall(pattern38, text)
for i, match in enumerate(matches38[:3], 1):
    print(f'\n   Match {i}:')
    print(f'   {match[:200]}')

# Suche nach (37) - Verfahren
print('\n\n3. VERFAHREN (37):')
pattern37 = r'\(37\)[^\n]*([^\n]{0,100})'
matches37 = re.findall(pattern37, text)
for i, match in enumerate(matches37[:3], 1):
    print(f'   Match {i}: {match.strip()}')

# Zeige kompletten Block um HS-Code herum
print('\n\n4. KOMPLETTER BLOCK UM HS-CODE:')
hs_codes = ['84717098', '85366990', '85444995']
for hs in hs_codes[:2]:  # Nur ersten zwei zur Demo
    pos = text.find(hs)
    if pos > 0:
        block = text[max(0, pos-300):pos+500]
        print(f'\n   Block um {hs}:')
        print('   ' + '-'*70)
        print(block)
        print('   ' + '-'*70)
