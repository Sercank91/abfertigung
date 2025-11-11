#!/usr/bin/env python
"""
Debug: Position 1 und 3 - Warum kein Gewicht und Verfahren?
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
print('DEBUG: POSITION 1 und 3')
print('='*80)

# Position 1: 84717098
# Position 3: 85366990

for hs_code in ['84717098', '85366990']:
    print(f'\n{"="*80}')
    print(f'HS-CODE: {hs_code}')
    print('='*80)

    hs_pos = text.find(hs_code)
    if hs_pos == -1:
        print(f'❌ {hs_code} nicht gefunden')
        continue

    # Block nach HS-Code
    after_hs = text[hs_pos:hs_pos + 800]

    print(f'\n📍 Position: {hs_pos}')

    # TEIL 1: GEWICHT - Suche nach allen Patterns
    print('\n🔍 GEWICHT - Nach HS-Code (erste 400 Zeichen):')
    print('-'*80)
    print(after_hs[:400])
    print('-'*80)

    # Pattern 1: | | | X,Y
    weight_pattern1 = r'\|\s*\|\s*\|\s*(\d+[.,]\d+)'
    weight_match1 = re.search(weight_pattern1, after_hs[:300])
    if weight_match1:
        print(f'\n✅ Pattern 1 (| | | X,Y): {weight_match1.group(1)}')
    else:
        print(f'\n❌ Pattern 1 (| | | X,Y): Nicht gefunden')

    # Pattern 2: | | X,Y
    weight_pattern2 = r'\|\s*\|\s*(\d+[.,]\d+)'
    weight_match2 = re.search(weight_pattern2, after_hs[:200])
    if weight_match2:
        print(f'✅ Pattern 2 (| | X,Y): {weight_match2.group(1)}')
    else:
        print(f'❌ Pattern 2 (| | X,Y): Nicht gefunden')

    # Pattern 3: Suche nach (38) Eigenmasse Code
    weight_pattern3 = r'\(38\)[^\n]*\n[^\n]*?(\d+[.,]\d+)'
    weight_match3 = re.search(weight_pattern3, after_hs[:500])
    if weight_match3:
        print(f'✅ Pattern 3 ((38) mit Gewicht): {weight_match3.group(1)}')
    else:
        print(f'❌ Pattern 3 ((38) mit Gewicht): Nicht gefunden')
        # Suche nur nach (38)
        if '(38)' in after_hs[:500]:
            print(f'   ℹ️  (38) Code gefunden, aber kein Gewicht erkannt')
            idx = after_hs.find('(38)')
            print(f'   Kontext: {after_hs[idx:idx+150]}')

    # Suche nach ALLEN Gewichts-ähnlichen Patterns
    all_weights = re.findall(r'(\d+[.,]\d+)', after_hs[:400])
    if all_weights:
        print(f'\n💡 Alle Zahlen mit Komma/Punkt in den ersten 400 Zeichen:')
        for w in all_weights[:10]:  # Zeige erste 10
            print(f'   - {w}')

    # Suche auch VOR HS-Code nach Gewicht
    print('\n🔍 GEWICHT - VOR HS-Code (letzte 200 Zeichen):')
    print('-'*80)
    before_hs = text[max(0, hs_pos - 200):hs_pos]
    print(before_hs)
    print('-'*80)

    weight_before = re.search(r'(\d+[.,]\d+)\s*CT', before_hs, re.IGNORECASE)
    if weight_before:
        print(f'✅ Gewicht VOR HS-Code (X.Y CT): {weight_before.group(1)}')
    else:
        print(f'❌ Gewicht VOR HS-Code: Nicht gefunden')

    # TEIL 2: VERFAHREN
    print('\n\n🔍 VERFAHREN - Nach HS-Code (erste 400 Zeichen):')
    print('-'*80)
    print(repr(after_hs[:400]))
    print('-'*80)

    procedure_pattern = r'\|\s*(\d{3,4})\s+\|?\s*([A-Z]{2})\s+([A-Z]{2})'
    procedure_match = re.search(procedure_pattern, after_hs[:400])
    if procedure_match:
        print(f'\n✅ Verfahren Pattern (| XXX(X) |? XX XX): {procedure_match.group(1)} {procedure_match.group(2)} {procedure_match.group(3)}')
    else:
        print(f'\n❌ Verfahren Pattern (| XXX(X) |? XX XX): Nicht gefunden')

    # Alternative Pattern: Suche nach (37) Code
    procedure_pattern2 = r'\(37\)[^\n]*?(\d{3,4})'
    procedure_match2 = re.search(procedure_pattern2, after_hs[:500])
    if procedure_match2:
        print(f'✅ Verfahren Pattern 2 ((37) mit Code): {procedure_match2.group(1)}')
    else:
        print(f'❌ Verfahren Pattern 2 ((37) mit Code): Nicht gefunden')
        # Suche nur nach (37)
        if '(37)' in after_hs[:500]:
            print(f'   ℹ️  (37) Code gefunden, aber kein Verfahrenscode erkannt')
            idx = after_hs.find('(37)')
            print(f'   Kontext: {after_hs[idx:idx+150]}')

    # Alternative: Suche nach allen 3-4 stelligen Zahlen
    all_codes = re.findall(r'\b(\d{3,4})\b', after_hs[:400])
    if all_codes:
        print(f'\n💡 Alle 3-4 stelligen Zahlen:')
        for c in all_codes[:10]:
            print(f'   - {c}')

    # Alternative: Suche nach "DE TR" oder Ländercodes
    country_pattern = r'([A-Z]{2})\s+([A-Z]{2})'
    country_matches = re.findall(country_pattern, after_hs[:400])
    if country_matches:
        print(f'\n💡 Alle Ländercode-Paare (XX XX):')
        for cm in country_matches[:5]:
            print(f'   - {cm[0]} {cm[1]}')

print('\n' + '='*80)
