#!/usr/bin/env python
"""
Suche nach 2,75 Varianten im Position 2 Block
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
print('SUCHE NACH 2,75 VARIANTEN')
print('='*80)

# Finde Position 2 Block
pattern = r'^2\s+\d+[.,]?\d*\s*CT,'
match = re.search(pattern, text, re.MULTILINE)

if not match:
    print('❌ Position 2 nicht gefunden!')
    exit(1)

pos2_start = match.start()
pos2_end = pos2_start + 1703  # Wir kennen die Länge

block = text[pos2_start:pos2_end]

print(f'\n📦 Position 2 Block: {len(block)} Zeichen\n')

# Suche nach verschiedenen Varianten
print('🔍 VARIANTEN-SUCHE:')
print('-'*80)

# 1. "276" (OCR-Fehler: 2,75 → 276)
if '276' in block:
    idx = block.find('276')
    context = block[max(0, idx-50):idx+100]
    print('\n✅ Variante 1: "276" gefunden')
    print(f'   Kontext: ...{context}...')
    print('   💡 Könnte 2,75 sein (5→6 OCR-Fehler, Komma fehlt)')

# 2. "275" (Komma komplett weg)
if '275' in block:
    idx = block.find('275')
    context = block[max(0, idx-50):idx+100]
    print('\n✅ Variante 2: "275" gefunden')
    print(f'   Kontext: ...{context}...')
    print('   💡 Könnte 2,75 sein (Komma fehlt)')
else:
    print('\n❌ Variante 2: "275" nicht gefunden')

# 3. "2 75" (Komma als Leerzeichen)
if re.search(r'2\s+75', block):
    match = re.search(r'2\s+75', block)
    idx = match.start()
    context = block[max(0, idx-50):idx+100]
    print('\n✅ Variante 3: "2 75" (mit Leerzeichen) gefunden')
    print(f'   Kontext: ...{context}...')
    print('   💡 Könnte 2,75 sein (Komma als Leerzeichen)')
else:
    print('\n❌ Variante 3: "2 75" nicht gefunden')

# 4. Pattern: | | | 2XX (wo XX = 70-79)
pattern_2xx = r'\|\s*\|\s*\|\s*2[0-9]{2}'
match_2xx = re.search(pattern_2xx, block)
if match_2xx:
    num = match_2xx.group(0)
    idx = match_2xx.start()
    context = block[max(0, idx-30):idx+80]
    print(f'\n✅ Variante 4: Pattern "| | | 2XX" gefunden: {num}')
    print(f'   Kontext: {context}')
else:
    print('\n❌ Variante 4: Pattern "| | | 2XX" nicht gefunden')

# 5. Suche nach "| | |" und dann die nächsten 20 Zeichen
pipe_pattern = r'\|\s*\|\s*\|\s*([^\n]{1,20})'
pipe_matches = list(re.finditer(pipe_pattern, block))

if pipe_matches:
    print(f'\n\n💡 ALLE "| | |" PATTERNS im Block ({len(pipe_matches)} gefunden):')
    print('-'*80)
    for i, match in enumerate(pipe_matches, 1):
        content = match.group(1).strip()
        print(f'{i}. | | | {content}')

print('\n' + '='*80)
print('💡 LÖSUNG:')
print('='*80)
print('Wenn "| | | 276" gefunden wurde:')
print('  → Wahrscheinlich OCR-Fehler: 2,75 → 276')
print('  → Wir sollten Pattern erweitern für 2-3 stellige Zahlen in "| | |"')
print('  → Dann 276 → 2.76 kg konvertieren (oder besser 2.75 kg)')
print('')
print('ODER:')
print('  → Pattern für Ganzzahlen 1-999 in "| | |" erweitern')
print('  → Als Dezimalzahl interpretieren: 276 → 2.76 kg')
print('='*80)
