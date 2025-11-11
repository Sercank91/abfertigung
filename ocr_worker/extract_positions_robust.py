#!/usr/bin/env python
"""
ROBUSTE Positions-Extraktion mit (32) und Fallbacks
"""
import os
import re
from typing import List, Dict, Optional

debug_file = os.path.join(os.path.dirname(__file__), "uploads", "ocr_debug_test.txt")

if not os.path.exists(debug_file):
    print(f"❌ Datei nicht gefunden: {debug_file}")
    exit(1)

with open(debug_file, 'r', encoding='utf-8') as f:
    text = f.read()

print('='*80)
print('ROBUSTE POSITIONS-EXTRAKTION')
print('='*80)

# SCHRITT 1: Suche nach Code (32) als Positions-Marker
print('\n📍 SCHRITT 1: Suche nach Code (32)')
print('-'*80)

code32_pattern = r'\(32\)'
code32_match = re.search(code32_pattern, text)

if code32_match:
    positions_start = code32_match.start()
    print(f'✅ Code (32) gefunden an Position {positions_start}')
    # Arbeite nur mit Text AB (32)
    positions_text = text[positions_start:]
else:
    print(f'⚠️  Code (32) nicht gefunden - benutze gesamten Text')
    positions_text = text

# SCHRITT 2: Finde alle Positionsnummern
print('\n📍 SCHRITT 2: Finde alle Positionsnummern')
print('-'*80)

positions_found = []

# Pattern 1: | N | am Zeilenanfang oder mit Whitespace
pattern1 = r'^\s*\|\s*(\d+)\s*\|'
for match in re.finditer(pattern1, positions_text, re.MULTILINE):
    pos_num = int(match.group(1))
    if 1 <= pos_num <= 20:  # Nur realistische Positionsnummern
        positions_found.append({
            'number': pos_num,
            'start': match.start(),
            'pattern': 'Kästchen | N |'
        })

# Pattern 2: ^N am Zeilenanfang gefolgt von Zahl und CT
pattern2 = r'^(\d+)\s+\d+[.,]?\d*\s*CT'
for match in re.finditer(pattern2, positions_text, re.MULTILINE):
    pos_num = int(match.group(1))
    if 1 <= pos_num <= 20:
        # Prüfe ob wir diese Position nicht schon haben
        if not any(p['number'] == pos_num for p in positions_found):
            positions_found.append({
                'number': pos_num,
                'start': match.start(),
                'pattern': 'Zeilenanfang N CT'
            })

# Sortiere nach Textposition
positions_found.sort(key=lambda x: x['start'])

print(f'✅ {len(positions_found)} Positionen gefunden:')
for p in positions_found:
    print(f"   Position {p['number']} ({p['pattern']}) an Position {p['start']}")

# SCHRITT 3: Extrahiere HS-Codes als Backup
print('\n📍 SCHRITT 3: Finde alle HS-Codes (Backup)')
print('-'*80)

hs_codes = []
# Suche 8-stellige Codes die typisch für HS-Codes sind
hs_pattern = r'\b(\d{8})\b'
for match in re.finditer(hs_pattern, positions_text):
    code = match.group(1)
    # Filtere False Positives
    if code.startswith(('84', '85', '39', '72', '73', '87', '90', '94', '95')):
        if code not in hs_codes:
            hs_codes.append(code)

print(f'✅ {len(hs_codes)} HS-Codes gefunden: {", ".join(hs_codes)}')

# WARNUNG: Wenn Anzahl nicht übereinstimmt
if len(positions_found) != len(hs_codes):
    print(f'\n⚠️  WARNUNG: {len(positions_found)} Positionsnummern vs {len(hs_codes)} HS-Codes!')
    print(f'   Möglicherweise sind einige Positionen auf einer anderen Seite.')

# SCHRITT 4: Extrahiere Daten für jede Position
print('\n\n📦 POSITIONS-DATEN:')
print('='*80)

for i, pos_info in enumerate(positions_found):
    pos_num = pos_info['number']
    start = pos_info['start']

    # Block-Ende: Start der nächsten Position oder +2000 Zeichen
    if i + 1 < len(positions_found):
        end = positions_found[i + 1]['start']
    else:
        end = start + 2000

    block = positions_text[start:end]

    print(f'\n{"="*80}')
    print(f'POSITION {pos_num}')
    print(f'{"="*80}')

    position_data = {
        'orderNumber': pos_num,
        'hsCode': None,
        'description': None,
        'netWeight': 0.0,
        'procedure': None
    }

    # 1. Beschreibung
    first_line = block.split('\n')[0]
    # Pattern: CT, Karton XXXXXXXX Beschreibung
    desc_match = re.search(r'CT,?\s*[A-Za-z\s]*\d+\s+(.+)', first_line)
    if desc_match:
        description = desc_match.group(1).strip()
        position_data['description'] = description[:200]
        print(f'📝 Beschreibung: {description[:80]}')
    else:
        print(f'❌ Beschreibung: Nicht gefunden')

    # 2. HS-Code
    hs_match = re.search(r'\b(\d{8})\b', block)
    if hs_match:
        hs_code = hs_match.group(1)
        if hs_code.startswith(('84', '85', '39', '72', '73', '87', '90', '94', '95')):
            position_data['hsCode'] = hs_code
            print(f'🔢 HS-Code: {hs_code}')

    if not position_data['hsCode']:
        print(f'❌ HS-Code: Nicht gefunden')

    # 3. Gewicht
    weight_patterns = [
        (r'\|\s*\|\s*\|\s*(\d+[.,]\d+)', '| | | X,Y'),
        (r'\|\s*\|\s*(\d+[.,]\d+)', '| | X,Y'),
    ]

    for pattern, desc in weight_patterns:
        weight_match = re.search(pattern, block)
        if weight_match:
            weight_str = weight_match.group(1).replace(',', '.')
            try:
                weight = float(weight_str)
                if 0.01 <= weight <= 100:
                    position_data['netWeight'] = weight
                    print(f'⚖️  Gewicht: {weight} kg (Pattern: {desc})')
                    break
            except:
                pass

    if position_data['netWeight'] == 0.0:
        print(f'❌ Gewicht: Nicht gefunden')

    # 4. Verfahren
    proc_match = re.search(r'\|\s*(\d{3,4})\s+\|?\s*([A-Z]{2})\s+([A-Z]{2})', block)
    if proc_match:
        proc_code = proc_match.group(1)
        if len(proc_code) == 3:
            proc_code = proc_code + '0'
        position_data['procedure'] = proc_code
        print(f'🔄 Verfahren: {proc_code}')
    else:
        print(f'❌ Verfahren: Nicht gefunden')

print('\n' + '='*80)
print('💡 NÄCHSTE SCHRITTE:')
print('='*80)
print('1. ✅ Code (32) als primärer Marker (wenn verfügbar)')
print('2. ✅ Positionsnummern-Patterns (Kästchen + Zeilenanfang)')
print('3. ✅ HS-Codes als Validierung')
print('4. ⚠️  Position 3 fehlt wahrscheinlich auf Seite 2')
print('='*80)
