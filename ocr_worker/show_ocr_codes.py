#!/usr/bin/env python
"""
Zeigt ALLE Codes (X) im OCR-Text mit Kontext
"""
import sys
import re

if len(sys.argv) < 2:
    print("Usage: python show_ocr_codes.py <debug-text-file>")
    sys.exit(1)

# Lese Datei
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    text = f.read()

print("="*80)
print("ALLE CODES IM OCR-TEXT")
print("="*80)

# Suche nach allen (XX) oder (X) Patterns
pattern = r'\((\d{1,2}[a-z]?)\)'
matches = re.finditer(pattern, text)

codes_found = {}
for match in matches:
    code = match.group(1)
    pos = match.start()

    # Kontext: 100 Zeichen davor und 200 danach
    context_start = max(0, pos - 100)
    context_end = min(len(text), pos + 200)
    context = text[context_start:context_end]

    # Speichere ersten Kontext für jeden Code
    if code not in codes_found:
        codes_found[code] = context

# Sortiere nach Code-Nummer
sorted_codes = sorted(codes_found.items(), key=lambda x: (len(x[0]), x[0]))

print(f"\n✅ Gefunden: {len(sorted_codes)} unterschiedliche Codes\n")

# Zeige wichtige Codes zuerst
priority_codes = ['2', '6', '8', '15', '15a', '17', '17a', '35', '38', '44']

print("🎯 WICHTIGE CODES:")
print("-" * 80)
for code in priority_codes:
    if code in codes_found:
        print(f"\n({code}):")
        context = codes_found[code].replace('\n', ' ').strip()
        # Zeige nur relevanten Teil
        idx = context.find(f'({code})')
        if idx > 0:
            start = max(0, idx - 50)
            end = min(len(context), idx + 150)
            print(f"  ...{context[start:end]}...")

print("\n\n📋 ALLE GEFUNDENEN CODES:")
print("-" * 80)
for code, context in sorted_codes:
    print(f"({code})")

print("\n" + "="*80)
print("💡 TIPP: Suche nach 'kg' für Gewichtsfelder")
print("="*80)

# Suche nach allem mit "kg"
kg_pattern = r'[^\n]*kg[^\n]*'
kg_matches = re.findall(kg_pattern, text, re.IGNORECASE)

print("\n🔍 Alle Zeilen mit 'kg':")
for i, line in enumerate(kg_matches[:10], 1):  # Erste 10
    print(f"  {i}. {line.strip()}")

print("\n" + "="*80)
print("💡 TIPP: Suche nach 'Packst' für Packstücke")
print("="*80)

# Suche nach Packst
packst_pattern = r'[^\n]*[Pp]ackst[^\n]*'
packst_matches = re.findall(packst_pattern, text, re.IGNORECASE)

print("\n🔍 Alle Zeilen mit 'Packst':")
for i, line in enumerate(packst_matches[:10], 1):
    print(f"  {i}. {line.strip()}")

print("\n" + "="*80)
