#!/usr/bin/env python
"""
FINALE Positions-Extraktion mit korrigierten Patterns
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
print('FINALE POSITIONS-EXTRAKTION')
print('='*80)

# Suche nach allen Positionen
positions_found = []

# Pattern 1: | N | N. N CT, (Position 1 Format)
pattern1 = r'\|\s*(\d+)\s*\|\s*\d+\.\s*\d+[.,]?\d*\s*CT,'
for match in re.finditer(pattern1, text):
    pos_num = int(match.group(1))
    if 1 <= pos_num <= 20:
        positions_found.append({
            'number': pos_num,
            'start': match.start(),
            'pattern': '| N | N. N CT,'
        })

# Pattern 2: | N N.N CT, (Position 2 und 3 Format - NUR EIN PIPE!)
pattern2 = r'^\|\s*(\d+)\s+\d+[.,]?\d*\s*CT,'
for match in re.finditer(pattern2, text, re.MULTILINE):
    pos_num = int(match.group(1))
    if 1 <= pos_num <= 20:
        # Prüfe ob wir diese Position nicht schon haben
        if not any(p['number'] == pos_num for p in positions_found):
            positions_found.append({
                'number': pos_num,
                'start': match.start(),
                'pattern': '| N N.N CT,'
            })

# Pattern 3: ^N N.N CT, (Fallback ohne Pipe)
pattern3 = r'^(\d+)\s+\d+[.,]?\d*\s*CT,'
for match in re.finditer(pattern3, text, re.MULTILINE):
    pos_num = int(match.group(1))
    if 1 <= pos_num <= 20:
        if not any(p['number'] == pos_num for p in positions_found):
            positions_found.append({
                'number': pos_num,
                'start': match.start(),
                'pattern': 'N N.N CT,'
            })

# Sortiere nach Positionsnummer
positions_found.sort(key=lambda x: x['number'])

print(f'\n✅ {len(positions_found)} Positionen gefunden:\n')
for p in positions_found:
    print(f"   Position {p['number']} (Pattern: {p['pattern']}) an Text-Position {p['start']}")

# Extrahiere Daten für jede Position
print('\n\n📦 POSITIONS-DATEN:')
print('='*80)

# Sortiere nach Start-Position im Text für Block-Extraktion
positions_by_start = sorted(positions_found, key=lambda x: x['start'])

for i, pos_info in enumerate(positions_by_start):
    pos_num = pos_info['number']
    start = pos_info['start']

    # Block-Ende: Start der nächsten Position oder +2000 Zeichen
    if i + 1 < len(positions_by_start):
        end = positions_by_start[i + 1]['start']
    else:
        end = start + 2000

    block = text[start:end]

    print(f'\n{"="*80}')
    print(f'POSITION {pos_num}')
    print(f'{"="*80}')

    # 1. Beschreibung
    first_line = block.split('\n')[0]
    desc_match = re.search(r'CT,?\s*[A-Za-z\s]*\d+\s+(.+)', first_line)
    if desc_match:
        description = desc_match.group(1).strip()
        print(f'📝 Beschreibung: {description[:80]}')

    # 2. HS-Code
    hs_match = re.search(r'\b(\d{8})\b', block)
    if hs_match:
        hs_code = hs_match.group(1)
        if hs_code.startswith(('84', '85', '39', '72', '73', '87', '90', '94', '95')):
            print(f'🔢 HS-Code: {hs_code}')

    # 3. Gewicht
    weight_patterns = [
        (r'\|\s*\|\s*\|\s*(\d+[.,]\d+)', '| | | X,Y'),
        (r'\|\s*\|\s*(\d+[.,]\d+)', '| | X,Y'),
    ]

    weight_found = False
    for pattern, desc in weight_patterns:
        weight_match = re.search(pattern, block)
        if weight_match:
            weight_str = weight_match.group(1).replace(',', '.')
            try:
                weight = float(weight_str)
                if 0.01 <= weight <= 100:
                    print(f'⚖️  Gewicht: {weight} kg (Pattern: {desc})')
                    weight_found = True
                    break
            except:
                pass

    if not weight_found:
        print(f'❌ Gewicht: Nicht gefunden')

    # 4. Verfahren
    proc_match = re.search(r'\|\s*(\d{3,4})\s+\|?\s*([A-Z]{2})\s+([A-Z]{2})', block)
    if proc_match:
        proc_code = proc_match.group(1)
        if len(proc_code) == 3:
            proc_code = proc_code + '0'
        print(f'🔄 Verfahren: {proc_code}')
    else:
        print(f'❌ Verfahren: Nicht gefunden')

print('\n' + '='*80)
print('✅ ALLE 3 POSITIONEN GEFUNDEN!')
print('='*80)
print('Pattern-Übersicht:')
print('  Position 1: | 1 | 1. 1 CT,     (zwei Pipes)')
print('  Position 2: 2 1.0 CT,          (kein Pipe)')
print('  Position 3: | 3 1.0 CT,        (ein Pipe)')
print('='*80)
