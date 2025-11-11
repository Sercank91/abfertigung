#!/usr/bin/env python
"""
Suche Position 3 - warum wird sie nicht gefunden?
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
print('SUCHE NACH POSITION 3')
print('='*80)

# Suche nach HS-Code 85444995
hs_code = '85444995'
hs_pos = text.find(hs_code)

if hs_pos == -1:
    print(f'❌ HS-Code {hs_code} nicht gefunden!')
    exit(1)

print(f'\n✅ HS-Code {hs_code} gefunden an Position {hs_pos}')

# Zeige VOR und NACH dem HS-Code
print('\n📋 500 Zeichen VOR HS-Code:')
print('='*80)
before = text[max(0, hs_pos-500):hs_pos]
print(before)

print('\n📋 1000 Zeichen NACH HS-Code:')
print('='*80)
after = text[hs_pos:hs_pos+1000]
print(after)

# Suche nach "3" in der Nähe
print('\n\n🔍 SUCHE NACH ZIFFER "3" im Bereich:')
print('-'*80)

search_area = text[max(0, hs_pos-1000):hs_pos+500]

# Pattern: | 3 |
pattern1 = r'\| 3 \|'
if re.search(pattern1, search_area):
    print('✅ Pattern "| 3 |" gefunden')
    match = re.search(pattern1, search_area)
    idx = match.start()
    context = search_area[max(0, idx-50):idx+200]
    print(f'   Kontext: {context}')
else:
    print('❌ Pattern "| 3 |" nicht gefunden')

# Pattern: ^3 am Zeilenanfang
pattern2 = r'^3\s'
if re.search(pattern2, search_area, re.MULTILINE):
    print('✅ Pattern "^3 " (Zeilenanfang) gefunden')
    match = re.search(pattern2, search_area, re.MULTILINE)
    idx = match.start()
    context = search_area[max(0, idx-50):idx+200]
    print(f'   Kontext: {context}')
else:
    print('❌ Pattern "^3 " (Zeilenanfang) nicht gefunden')

# Pattern: 3. am Zeilenanfang
pattern3 = r'^3\.'
if re.search(pattern3, search_area, re.MULTILINE):
    print('✅ Pattern "^3." (Zeilenanfang) gefunden')
    match = re.search(pattern3, search_area, re.MULTILINE)
    idx = match.start()
    context = search_area[max(0, idx-50):idx+200]
    print(f'   Kontext: {context}')
else:
    print('❌ Pattern "^3." (Zeilenanfang) nicht gefunden')

# Suche nach "3 |3" Pattern (aus dem Output vorher gesehen)
pattern4 = r'3\s*\|3'
if re.search(pattern4, search_area):
    print('✅ Pattern "3 |3" gefunden')
    match = re.search(pattern4, search_area)
    idx = match.start()
    context = search_area[max(0, idx-50):idx+200]
    print(f'   Kontext: {context}')
else:
    print('❌ Pattern "3 |3" nicht gefunden')

# Zeige alle Zeilen die "3" enthalten
print('\n\n🔍 ALLE ZEILEN MIT "3" im Suchbereich:')
print('-'*80)

lines = search_area.split('\n')
for i, line in enumerate(lines):
    if '3' in line:
        print(f'{i:3}. {line.strip()[:100]}')

# Suche nach === NEUE SEITE ===
print('\n\n🔍 SEITEN-MARKER:')
print('-'*80)

page_markers = list(re.finditer(r'=== NEUE SEITE ===', text))
print(f'\n✅ {len(page_markers)} Seiten-Marker gefunden')

for i, match in enumerate(page_markers, 1):
    pos = match.start()
    print(f'   Seite {i+1} beginnt an Position {pos}')

    # Ist Position 3 NACH diesem Marker?
    if pos < hs_pos < pos + 5000:
        print(f'   👉 HS-Code 85444995 ist auf Seite {i+1}!')

print('\n' + '='*80)
