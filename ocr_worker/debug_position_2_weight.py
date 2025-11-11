#!/usr/bin/env python
"""
Debug: Warum hat Position 2 (85366990) kein Gewicht?
"""
import os
import re

# Lese OCR-Text
debug_file = os.path.join(os.path.dirname(__file__), "uploads", "ocr_debug_test.txt")

if not os.path.exists(debug_file):
    print(f"❌ Datei nicht gefunden: {debug_file}")
    exit(1)

with open(debug_file, 'r', encoding='utf-8') as f:
    text = f.read()

print('='*80)
print('DEBUG: POSITION 2 (85366990) - Warum kein Gewicht?')
print('='*80)

hs_code = '85366990'
hs_pos = text.find(hs_code)

if hs_pos == -1:
    print(f'❌ HS-Code {hs_code} nicht gefunden!')
    exit(1)

print(f'\n✅ HS-Code gefunden an Position {hs_pos}')

# Zeige 1500 Zeichen NACH dem HS-Code
after_hs = text[hs_pos:hs_pos + 1500]

print('\n📋 1500 Zeichen NACH HS-Code:')
print('='*80)
print(after_hs)
print('='*80)

# Suche nach ALLEN Gewichts-Patterns
print('\n🔍 GEWICHTS-PATTERNS:')
print('-'*80)

# Pattern 1: | | | X,Y
pattern1 = r'\|\s*\|\s*\|\s*(\d+[.,]\d+)'
match1 = re.search(pattern1, after_hs)
if match1:
    print(f'✅ Pattern 1 (| | | X,Y): {match1.group(1)} an Position {match1.start()}')
else:
    print(f'❌ Pattern 1 (| | | X,Y): Nicht gefunden')

# Pattern 2: | | X,Y
pattern2 = r'\|\s*\|\s*(\d+[.,]\d+)'
match2 = re.search(pattern2, after_hs)
if match2:
    print(f'✅ Pattern 2 (| | X,Y): {match2.group(1)} an Position {match2.start()}')
    # Zeige Kontext
    idx = match2.start()
    print(f'   Kontext: {after_hs[max(0, idx-50):idx+100]}')
else:
    print(f'❌ Pattern 2 (| | X,Y): Nicht gefunden')

# Alle Dezimalzahlen
print('\n💡 ALLE Dezimalzahlen in den 1500 Zeichen:')
all_nums = re.findall(r'(\d+[.,]\d+)', after_hs)
if all_nums:
    for i, num in enumerate(all_nums[:15], 1):
        # Finde Position
        idx = after_hs.find(num)
        context = after_hs[max(0, idx-20):idx+30]
        print(f'  {i}. {num:>6} | {context}')
else:
    print('  Keine gefunden')

print('\n' + '='*80)
