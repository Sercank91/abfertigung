#!/usr/bin/env python
"""
Analysiert die zentrale Tabelle mit Positions-Daten
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
print('ANALYSE DER ZENTRALEN POSITIONS-TABELLE')
print('='*80)

# Suche nach der Zeile "| 1 | 1." die wir gefunden haben
pos1_pattern = r'\|\s*1\s*\|\s*1\.'
match = re.search(pos1_pattern, text)

if match:
    start_pos = match.start()
    print(f'\n✅ Position 1 Zeile gefunden an Position {start_pos}')

    # Zeige 1500 Zeichen VOR dieser Zeile (um die Tabelle zu sehen)
    before_block = text[max(0, start_pos - 1500):start_pos]
    print('\n📋 1500 Zeichen VOR Position 1:')
    print('='*80)
    print(before_block)
    print('='*80)

    # Zeige 1000 Zeichen AB dieser Zeile
    after_block = text[start_pos:start_pos + 1000]
    print('\n📋 1000 Zeichen AB Position 1:')
    print('='*80)
    print(after_block)
    print('='*80)

# Suche nach allen Zeilen mit Tabellen-Struktur in diesem Bereich
print('\n\n🔍 ALLE TABELLEN-ZEILEN MIT VERFAHRENSCODE (XXX DE TR):')
print('-'*80)

# Pattern: | XXX(X) DE TR | oder | | XXX(X) DE TR |
table_pattern = r'([^\n]*\|\s*\|?\s*(\d{3,4})\s+[A-Z]{2}\s+[A-Z]{2}[^\n]*)'
table_matches = re.finditer(table_pattern, text)

count = 0
for match in table_matches:
    count += 1
    line = match.group(1).strip()
    code = match.group(2)
    pos = match.start()
    print(f'\n#{count} (Position {pos}):')
    print(f'   Code: {code}')
    print(f'   Zeile: {line}')

# Suche nach allen Zeilen mit | | | ZAHL Pattern (Gewichte)
print('\n\n🔍 ALLE TABELLEN-ZEILEN MIT | | | X,Y (Gewicht):')
print('-'*80)

weight_pattern = r'([^\n]*\|\s*\|\s*\|\s*(\d+[.,]\d+)[^\n]*)'
weight_matches = re.finditer(weight_pattern, text)

count = 0
for match in weight_matches:
    count += 1
    line = match.group(1).strip()
    weight = match.group(2)
    pos = match.start()
    print(f'\n#{count} (Position {pos}):')
    print(f'   Gewicht: {weight}')
    print(f'   Zeile: {line}')

print('\n' + '='*80)
