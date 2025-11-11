#!/usr/bin/env python
"""
Suche nach Gewichts- und Verfahrensdaten für Positionen 1 und 3
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
print('SUCHE NACH POSITION-TABELLE UND (38)/(37) CODES')
print('='*80)

# Suche nach ALLEN (38) Codes im gesamten Text
print('\n🔍 ALLE (38) EIGENMASSE-CODES IM DOKUMENT:')
print('-'*80)

pattern38 = r'\(38\)([^\n]*(?:\n[^\n]*){0,5})'
matches38 = re.finditer(pattern38, text)

count = 0
for match in matches38:
    count += 1
    pos = match.start()
    block = match.group(0)
    print(f'\n#{count} an Position {pos}:')
    print(block[:200])
    print('-'*40)

# Suche nach ALLEN (37) Codes im gesamten Text
print('\n\n🔍 ALLE (37) VERFAHREN-CODES IM DOKUMENT:')
print('-'*80)

pattern37 = r'\(37\)([^\n]*(?:\n[^\n]*){0,5})'
matches37 = re.finditer(pattern37, text)

count = 0
for match in matches37:
    count += 1
    pos = match.start()
    block = match.group(0)
    print(f'\n#{count} an Position {pos}:')
    print(block[:200])
    print('-'*40)

# Suche nach Positions-Tabelle (mehrere Zeilen mit |)
print('\n\n🔍 SUCHE NACH TABELLEN-STRUKTUR:')
print('-'*80)

# Suche nach Zeilen mit mehreren Pipes in Folge
table_pattern = r'([^\n]*\|[^\n]*\|[^\n]*\|[^\n]*)'
table_matches = re.findall(table_pattern, text)

if table_matches:
    print(f'\n✅ {len(table_matches)} Zeilen mit Tabellen-Struktur gefunden')
    print('\nErste 10 Zeilen:')
    for i, line in enumerate(table_matches[:10], 1):
        print(f'{i}. {line.strip()}')

# Suche speziell nach "Pos" oder "Position" in Tabellen
print('\n\n🔍 ZEILEN MIT "Pos" UND PIPE:')
print('-'*80)
pos_table_pattern = r'([^\n]*[Pp]os[^\n]*\|[^\n]*)'
pos_matches = re.findall(pos_table_pattern, text)

if pos_matches:
    print(f'\n✅ {len(pos_matches)} Zeilen gefunden')
    for i, line in enumerate(pos_matches[:15], 1):
        print(f'{i}. {line.strip()}')

# Suche nach "| 1 |" "| 2 |" "| 3 |" (Positionsnummern)
print('\n\n🔍 ZEILEN MIT POSITIONSNUMMERN | N |:')
print('-'*80)
for pos_num in [1, 2, 3]:
    pattern = rf'\|\s*{pos_num}\s*\|[^\n]{{0,200}}'
    matches = re.findall(pattern, text)
    if matches:
        print(f'\n| {pos_num} | gefunden ({len(matches)} mal):')
        for m in matches[:3]:
            print(f'  {m.strip()}')

print('\n' + '='*80)
