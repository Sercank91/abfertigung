#!/usr/bin/env python
"""
Analysiert die Gewichtsverteilung über alle Positionen
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
print('GEWICHTS-VERTEILUNG ANALYSE')
print('='*80)

# Rohmasse gesamt
rohmasse_pattern = r'\(35\)([^\n]*(?:\n[^\n]*){0,3})'
rohmasse_match = re.search(rohmasse_pattern, text)
if rohmasse_match:
    block = rohmasse_match.group(1)
    weight = re.search(r'(\d+[.,]\d+)', block)
    if weight:
        print(f'\n✅ Rohmasse GESAMT: {weight.group(1)} kg')

# Suche nach der zentralen Tabelle
print('\n\n📋 ZENTRALE TABELLE (um Position 1 herum):')
print('-'*80)

# Finde "| 1 | 1."
pos1_pattern = r'\|\s*1\s*\|\s*1\.'
match = re.search(pos1_pattern, text)

if match:
    start = match.start()
    # Zeige 200 VOR und 1500 NACH
    before = text[max(0, start-200):start]
    after = text[start:start+1500]

    print('\n200 Zeichen VOR Position 1:')
    print(before)
    print('\n' + '='*80)
    print('AB Position 1:')
    print(after)

# Finde ALLE Tabellen-Zeilen mit Zahlen
print('\n\n🔍 ALLE TABELLEN-ZEILEN MIT GEWICHTS-WERTEN:')
print('-'*80)

# Suche nach | | | ZAHL oder | | ZAHL
table_weight_pattern = r'(\|\s*\|\s*\|?\s*(\d+[.,]?\d*)\s*[^\n]{0,50})'
matches = re.finditer(table_weight_pattern, text)

found = []
for match in matches:
    line = match.group(1).strip()
    value = match.group(2)
    pos = match.start()

    # Filtere sehr große Zahlen (Codes, etc.)
    try:
        num_val = float(value.replace(',', '.'))
        if 0.01 <= num_val <= 20000:  # Realistischer Gewichtsbereich
            found.append({
                'pos': pos,
                'value': value,
                'line': line
            })
    except:
        pass

# Zeige gefundene Werte
if found:
    print(f'\n✅ {len(found)} Tabellen-Zeilen mit Gewichts-ähnlichen Werten gefunden:\n')
    for i, item in enumerate(found, 1):
        print(f'{i}. Position {item["pos"]:5}: {item["value"]:>8} | {item["line"]}')

# Berechne Summe
print('\n\n💡 GEWICHTS-BERECHNUNG:')
print('-'*80)

weights_found = {
    'Position 1': 9.3,
    'Position 2': 0.0,  # Unbekannt
    'Position 3': 0.85,
    'Gesamt (Rohmasse)': 16.22
}

total_from_positions = weights_found['Position 1'] + weights_found['Position 3']
missing = weights_found['Gesamt (Rohmasse)'] - total_from_positions

print(f"\nPosition 1: {weights_found['Position 1']} kg")
print(f"Position 2: {weights_found['Position 2']} kg (fehlt)")
print(f"Position 3: {weights_found['Position 3']} kg")
print(f"─" * 30)
print(f"Summe bekannt: {total_from_positions} kg")
print(f"Gesamt (Rohmasse): {weights_found['Gesamt (Rohmasse)']} kg")
print(f"─" * 30)
print(f"DIFFERENZ: {missing:.2f} kg")
print(f"\n💡 Position 2 müsste {missing:.2f} kg haben!")

print('\n' + '='*80)
