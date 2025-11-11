#!/usr/bin/env python
"""
Sucht nach Positions-Nummerierung im OCR-Text
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
print('SUCHE NACH POSITIONS-NUMMERIERUNG')
print('='*80)

# Suche nach "Pos" im Text
print('\n🔍 ALLE ZEILEN MIT "Pos":')
print('-'*80)

pos_lines = [line for line in text.split('\n') if 'Pos' in line or 'pos' in line]
for i, line in enumerate(pos_lines[:20], 1):
    print(f'{i}. {line.strip()}')

# Suche nach verschiedenen Patterns für Position 1, 2, 3
print('\n\n🔍 POSITIONS-PATTERNS:')
print('-'*80)

patterns = [
    (r'\| 1 \|', 'Pattern: | 1 |'),
    (r'^\s*1\.\s', 'Pattern: 1. am Zeilenanfang'),
    (r'^1 ', 'Pattern: 1 am Zeilenanfang'),
    (r'\| 2 \|', 'Pattern: | 2 |'),
    (r'^\s*2\.\s', 'Pattern: 2. am Zeilenanfang'),
    (r'^2 ', 'Pattern: 2 am Zeilenanfang'),
    (r'\| 3 \|', 'Pattern: | 3 |'),
    (r'^\s*3\.\s', 'Pattern: 3. am Zeilenanfang'),
    (r'^3 ', 'Pattern: 3 am Zeilenanfang'),
]

for pattern, desc in patterns:
    matches = list(re.finditer(pattern, text, re.MULTILINE))
    if matches:
        print(f'\n✅ {desc}: {len(matches)} mal gefunden')
        for match in matches[:3]:
            pos = match.start()
            context = text[max(0, pos-20):pos+150]
            print(f'   Position {pos}: {context[:100]}')

# Zeige die Struktur um "| 1 |" herum
print('\n\n🔍 STRUKTUR UM "| 1 |":')
print('-'*80)

match = re.search(r'\| 1 \|', text)
if match:
    pos = match.start()
    before = text[max(0, pos-500):pos]
    after = text[pos:pos+1500]

    print('\n500 Zeichen VOR | 1 |:')
    print(before)
    print('\n' + '='*80)
    print('AB | 1 | (1500 Zeichen):')
    print(after)

# Suche nach dem Pattern "N. N CT," (z.B. "1. 1 CT," oder "2 1.0 CT,")
print('\n\n🔍 PATTERN "N. N CT," oder "N N.N CT,":')
print('-'*80)

ct_pattern = r'(\d+)[\.\s]+(\d+[.,]?\d*)\s*CT,?\s*([^\n]{0,80})'
ct_matches = list(re.finditer(ct_pattern, text, re.MULTILINE))

if ct_matches:
    print(f'\n✅ {len(ct_matches)} Treffer gefunden:\n')
    for match in ct_matches[:10]:
        num = match.group(1)
        qty = match.group(2)
        desc = match.group(3)
        print(f'Position {num}: {qty} CT, {desc[:60]}')

print('\n' + '='*80)
