#!/usr/bin/env python
"""
Debug: Testet die Patterns für Gewicht und Verfahren
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
print('DEBUG: GEWICHT UND VERFAHREN PATTERNS')
print('='*80)

hs_codes = ['84717098', '85366990', '85444995']

for hs_code in hs_codes:
    print(f'\n{"="*80}')
    print(f'HS-CODE: {hs_code}')
    print('='*80)

    hs_pos = text.find(hs_code)
    if hs_pos == -1:
        print(f'❌ {hs_code} nicht gefunden')
        continue

    # Block vor HS-Code
    before_hs = text[max(0, hs_pos - 500):hs_pos]
    # Block nach HS-Code
    after_hs = text[hs_pos:hs_pos + 800]

    print(f'\n📍 Position: {hs_pos}')

    # 1. GEWICHT PATTERNS
    print('\n🔍 GEWICHT - Block vor HS-Code (letzte 200 Zeichen):')
    print('-'*80)
    print(repr(before_hs[-200:]))
    print('-'*80)

    # Pattern 1: | | 9,3
    weight_pattern1 = r'\|\s*\|\s*(\d+[.,]\d+)'
    weight_match1 = re.search(weight_pattern1, before_hs[-200:])
    if weight_match1:
        print(f'✅ Pattern 1 (| | X,Y): {weight_match1.group(1)}')
    else:
        print(f'❌ Pattern 1 (| | X,Y): Nicht gefunden')

    # Pattern 2: | 3 | 3. 1.0 CT
    weight_pattern2 = r'\|\s*\d+\s*\|\s*\d+\.\s*(\d+[.,]\d+)\s*CT'
    weight_match2 = re.search(weight_pattern2, before_hs[-200:], re.IGNORECASE)
    if weight_match2:
        print(f'✅ Pattern 2 (| N | N. X.Y CT): {weight_match2.group(1)}')
    else:
        print(f'❌ Pattern 2 (| N | N. X.Y CT): Nicht gefunden')

    # Pattern 3: X.Y CT
    weight_pattern3 = r'(\d+[.,]\d+)\s*CT'
    weight_match3 = re.search(weight_pattern3, before_hs[-150:], re.IGNORECASE)
    if weight_match3:
        print(f'✅ Pattern 3 (X.Y CT): {weight_match3.group(1)}')
    else:
        print(f'❌ Pattern 3 (X.Y CT): Nicht gefunden')

    # 2. VERFAHREN PATTERN
    print('\n🔍 VERFAHREN - Block nach HS-Code (erste 400 Zeichen):')
    print('-'*80)
    print(repr(after_hs[:400]))
    print('-'*80)

    procedure_pattern = r'\|\s*(\d{4})\s+[A-Z]{2}\s+[A-Z]{2}'
    procedure_match = re.search(procedure_pattern, after_hs[:400])
    if procedure_match:
        print(f'✅ Verfahren Pattern (| XXXX DE TR): {procedure_match.group(1)}')
    else:
        print(f'❌ Verfahren Pattern (| XXXX DE TR): Nicht gefunden')

        # Versuche alternative Patterns
        alt1 = re.search(r'(\d{4})\s+[A-Z]{2}\s+[A-Z]{2}', after_hs[:400])
        if alt1:
            print(f'   ℹ️  Alternative (ohne |): {alt1.group(0)}')

        alt2 = re.findall(r'\d{4}', after_hs[:400])
        if alt2:
            print(f'   ℹ️  Alle 4-stelligen Zahlen: {alt2}')

print('\n' + '='*80)
