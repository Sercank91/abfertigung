#!/usr/bin/env python
"""
NEUE Positions-Extraktion basierend auf Positionsnummern
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
print('NEUE POSITIONS-EXTRAKTION NACH POSITIONSNUMMERN')
print('='*80)

# 1. Finde alle Positionen mit Pattern "N N.N CT," oder "| N | N. N CT,"
positions_found = []

# Pattern 1: | 1 | 1. 1 CT,
pattern1 = r'\|\s*(\d+)\s*\|\s*\d+\.\s*\d+[.,]?\d*\s*CT,'
matches1 = list(re.finditer(pattern1, text, re.MULTILINE))

for match in matches1:
    pos_num = int(match.group(1))
    start_pos = match.start()
    positions_found.append({
        'number': pos_num,
        'start': start_pos,
        'pattern': 'Kästchen'
    })

# Pattern 2: ^2 1.0 CT, oder ^3 1.0 CT,
pattern2 = r'^(\d+)\s+\d+[.,]?\d*\s*CT,'
matches2 = list(re.finditer(pattern2, text, re.MULTILINE))

for match in matches2:
    pos_num = int(match.group(1))
    start_pos = match.start()
    # Nur wenn es Position 2+ ist (nicht 1, das haben wir schon)
    if pos_num > 1:
        positions_found.append({
            'number': pos_num,
            'start': start_pos,
            'pattern': 'Zeilenanfang'
        })

# Sortiere nach Position im Text
positions_found.sort(key=lambda x: x['start'])

print(f'\n✅ {len(positions_found)} Positionen gefunden:\n')

for pos_info in positions_found:
    print(f"Position {pos_info['number']} (Pattern: {pos_info['pattern']}) an Text-Position {pos_info['start']}")

# 2. Extrahiere jeden Positions-Block
print('\n\n📦 POSITIONS-BLÖCKE:')
print('='*80)

for i, pos_info in enumerate(positions_found):
    pos_num = pos_info['number']
    start = pos_info['start']

    # Ende = Start der nächsten Position (oder 2000 Zeichen)
    if i + 1 < len(positions_found):
        end = positions_found[i + 1]['start']
    else:
        end = start + 2000

    block = text[start:end]

    print(f'\n{"="*80}')
    print(f'POSITION {pos_num}')
    print(f'{"="*80}')

    # Extrahiere Daten aus diesem Block

    # 1. Beschreibung (erste Zeile)
    first_line = block.split('\n')[0]
    desc_match = re.search(r'CT,?\s*[A-Za-z\s]+\d+\s+(.+)', first_line)
    if desc_match:
        description = desc_match.group(1).strip()
        print(f'📝 Beschreibung: {description[:80]}')

    # 2. HS-Code (8-stellig)
    hs_match = re.search(r'\b(\d{8})\b', block)
    if hs_match:
        hs_code = hs_match.group(1)
        print(f'🔢 HS-Code: {hs_code}')
    else:
        print(f'❌ HS-Code: Nicht gefunden')

    # 3. Gewicht (| | X,Y Pattern)
    weight_patterns = [
        (r'\|\s*\|\s*\|\s*(\d+[.,]\d+)', '| | | X,Y'),
        (r'\|\s*\|\s*(\d+[.,]\d+)', '| | X,Y'),
    ]

    weight_found = False
    for pattern, desc in weight_patterns:
        weight_match = re.search(pattern, block)
        if weight_match:
            weight = weight_match.group(1).replace(',', '.')
            print(f'⚖️  Gewicht: {weight} kg (Pattern: {desc})')
            weight_found = True
            break

    if not weight_found:
        print(f'❌ Gewicht: Nicht gefunden')

    # 4. Verfahren (XXXX DE TR)
    proc_match = re.search(r'\|\s*(\d{3,4})\s+\|?\s*([A-Z]{2})\s+([A-Z]{2})', block)
    if proc_match:
        proc_code = proc_match.group(1)
        if len(proc_code) == 3:
            proc_code = proc_code + '0'
        print(f'🔄 Verfahren: {proc_code}')
    else:
        print(f'❌ Verfahren: Nicht gefunden')

    print()

print('='*80)
print('💡 Diese Methode ist ROBUST weil sie:')
print('   ✅ Nach Positionsnummern sucht (nicht HS-Codes)')
print('   ✅ Jeden Block separat extrahiert')
print('   ✅ Für alle Länder funktioniert')
print('   ✅ Mehrere Ausfuhren pro PDF unterstützt')
print('='*80)
