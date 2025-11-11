#!/usr/bin/env python
"""
Analysiert die (32) Positions-Struktur - der RICHTIGE Ansatz!
"""
import os
import re

debug_file = os.path.join(os.path.dirname(__file__), "uploads", "ocr_debug_test.txt")

if not os.path.exists(debug_file):
    print(f"❌ Datei nicht gefunden: {debug_file}")
    exit(1)

with open(debug_file, 'r', encoding='utf-8') as f:
    text = f.read()

print('='*80)
print('ANALYSE DER (32) POSITIONS-STRUKTUR')
print('='*80)

# 1. Finde Code (32)
print('\n🔍 SUCHE NACH CODE (32):')
print('-'*80)

pattern32 = r'\(32\)'
matches32 = list(re.finditer(pattern32, text))

if matches32:
    print(f'\n✅ Code (32) gefunden: {len(matches32)} mal\n')

    for i, match in enumerate(matches32, 1):
        pos = match.start()
        context = text[max(0, pos-50):pos+200]
        print(f'#{i} an Position {pos}:')
        print(context)
        print('-'*80)
else:
    print('❌ Code (32) nicht gefunden!')

# 2. Finde Positions-Kästchen | N |
print('\n\n🔍 SUCHE NACH POSITIONS-KÄSTCHEN | N |:')
print('-'*80)

pos_pattern = r'^\s*\|\s*(\d+)\s*\|(.{0,100})'
pos_matches = list(re.finditer(pos_pattern, text, re.MULTILINE))

if pos_matches:
    print(f'\n✅ {len(pos_matches)} Kästchen gefunden:\n')

    for match in pos_matches[:10]:
        pos_num = match.group(1)
        rest = match.group(2).strip()
        text_pos = match.start()
        print(f'| {pos_num} | an Position {text_pos}: {rest[:80]}')

# 3. Zeige Struktur NACH (32)
if matches32:
    print('\n\n🔍 STRUKTUR NACH CODE (32):')
    print('-'*80)

    code32_pos = matches32[0].start()
    after_32 = text[code32_pos:code32_pos+2000]

    print(after_32)

print('\n' + '='*80)
