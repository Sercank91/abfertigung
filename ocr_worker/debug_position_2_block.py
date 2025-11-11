#!/usr/bin/env python
"""
Debug Position 2 Block mit neuer Methode
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
print('DEBUG: POSITION 2 BLOCK')
print('='*80)

# Finde Position 2 mit dem Pattern
pattern2 = r'^(\d+)\s+\d+[.,]?\d*\s*CT,'
matches = list(re.finditer(pattern2, text, re.MULTILINE))

pos2_match = None
for match in matches:
    if int(match.group(1)) == 2:
        pos2_match = match
        break

if not pos2_match:
    print('❌ Position 2 nicht gefunden!')
    exit(1)

pos2_start = pos2_match.start()
print(f'✅ Position 2 gefunden an Position {pos2_start}')

# Finde Position 3
pattern3 = r'^\|\s*3\s+\d+[.,]?\d*\s*CT,'
match3 = re.search(pattern3, text, re.MULTILINE)

if match3:
    pos3_start = match3.start()
    print(f'✅ Position 3 gefunden an Position {pos3_start}')
    block_end = pos3_start
else:
    print('⚠️  Position 3 nicht gefunden, benutze +2000')
    block_end = pos2_start + 2000

# Extrahiere Position 2 Block
block = text[pos2_start:block_end]
block_length = len(block)

print(f'\n📦 Position 2 Block: {block_length} Zeichen')
print('='*80)
print(block)
print('='*80)

# Suche nach Gewichts-Patterns
print('\n\n🔍 GEWICHTS-PATTERNS IM BLOCK:')
print('-'*80)

# Pattern 1: | | | X,Y (Dezimalzahl)
pattern1 = r'\|\s*\|\s*\|\s*(\d+[.,]\d+)'
match1 = re.search(pattern1, block)
if match1:
    print(f'✅ Pattern "| | | X,Y": {match1.group(1)}')
else:
    print(f'❌ Pattern "| | | X,Y": Nicht gefunden')

# Pattern 2: | | X,Y (Dezimalzahl)
pattern2 = r'\|\s*\|\s*(\d+[.,]\d+)'
match2 = re.search(pattern2, block)
if match2:
    print(f'✅ Pattern "| | X,Y": {match2.group(1)}')
else:
    print(f'❌ Pattern "| | X,Y": Nicht gefunden')

# Erweitert: | | | X (auch OHNE Dezimalstelle!)
pattern3 = r'\|\s*\|\s*\|\s*(\d+(?:[.,]\d+)?)'
match3 = re.search(pattern3, block)
if match3:
    print(f'💡 Pattern "| | | X" (auch Ganzzahl): {match3.group(1)}')
else:
    print(f'❌ Pattern "| | | X": Nicht gefunden')

# Alle Zahlen im Block
print('\n\n💡 ALLE ZAHLEN IM BLOCK:')
print('-'*80)

# Dezimalzahlen
decimals = re.findall(r'\d+[.,]\d+', block)
if decimals:
    print(f'Dezimalzahlen: {", ".join(decimals[:10])}')
else:
    print('Keine Dezimalzahlen gefunden')

# Alle Zahlen
numbers = re.findall(r'\b\d+\b', block)
if numbers:
    print(f'Alle Zahlen (erste 15): {", ".join(numbers[:15])}')

# Suche speziell nach "| | | 276"
if '276' in block:
    idx = block.find('276')
    context = block[max(0, idx-30):idx+50]
    print(f'\n💡 "276" gefunden im Kontext:')
    print(f'   {context}')

print('\n' + '='*80)
print('💡 ANALYSE:')
print('='*80)
print('Wenn "| | | 276" gefunden wurde (OHNE Dezimalstelle),')
print('dann ist das wahrscheinlich ein Warenwert, nicht das Gewicht.')
print('')
print('Möglichkeiten:')
print('1. Position 2 hat kein separates Gewicht im Dokument')
print('2. Das Gewicht steht in einem anderen Format')
print('3. Wir müssen das Pattern erweitern für Ganzzahlen')
print('='*80)
