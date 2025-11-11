#!/usr/bin/env python
"""
Analysiert OCR-Debug-Text und zeigt alle gefundenen Werte
"""
import sys
import re

if len(sys.argv) < 2:
    print("Usage: python analyze_ocr_text.py <debug-text-file>")
    sys.exit(1)

# Lese Datei
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    text = f.read()

print("="*80)
print("OCR TEXT ANALYSE")
print("="*80)

# 1. Suche Rohmasse (35)
print("\n1. ROHMASSE (35) - Alle Vorkommen:")
pattern1 = r'Rohmasse.*?\(35\)\s*[\r\n]+\s*([\d,\.]+)'
matches1 = re.findall(pattern1, text, re.IGNORECASE | re.DOTALL)
for i, match in enumerate(matches1, 1):
    print(f"   Match {i}: {match}")
if not matches1:
    print("   ❌ Nicht gefunden!")

# 2. Suche Packstücke (6)
print("\n2. PACKSTÜCKE (6) - Alle Vorkommen:")
pattern2 = r'Packst.*?\(6\)\s*[\r\n]+\s*(\d+)'
matches2 = re.findall(pattern2, text, re.IGNORECASE | re.DOTALL)
for i, match in enumerate(matches2, 1):
    print(f"   Match {i}: {match}")
if not matches2:
    print("   ❌ Nicht gefunden!")

# 3. Suche Empfänger (8) Block
print("\n3. EMPFÄNGER (8) - Block:")
pattern3 = r'Empf.*?\(8\)[^\n]*[\r\n]+((?:[^\n]+[\r\n]){1,5})'
matches3 = re.findall(pattern3, text, re.IGNORECASE)
for i, match in enumerate(matches3, 1):
    print(f"   Block {i}:")
    print(f"   {match.strip()}")
if not matches3:
    print("   ❌ Nicht gefunden!")

# 4. Suche nach türkischen Firmennamen
print("\n4. TÜRKISCHE FIRMEN (Ltd, Sti, A.Ş):")
pattern4 = r'([^\n]*(?:Ltd|Sti|A\.Ş|Teknik|Endüstri)[^\n]*)'
matches4 = re.findall(pattern4, text, re.IGNORECASE)
for i, match in enumerate(matches4[:5], 1):  # Zeige nur erste 5
    print(f"   Match {i}: {match.strip()}")
if not matches4:
    print("   ❌ Nicht gefunden!")

# 5. Suche DEUTAWERKE
print("\n5. DEUTAWERKE:")
pattern5 = r'(DEUT[A-Z]+)'
matches5 = re.findall(pattern5, text, re.IGNORECASE)
for i, match in enumerate(set(matches5), 1):  # Unique nur
    print(f"   Match {i}: {match}")
if not matches5:
    print("   ❌ Nicht gefunden!")

# 6. Suche MRN
print("\n6. MRN:")
pattern6 = r'MRN\s*(\d{2}[A-Z]{2}[A-Z0-9]{14})'
matches6 = re.findall(pattern6, text)
for i, match in enumerate(matches6, 1):
    print(f"   Match {i}: {match}")
if not matches6:
    print("   ❌ Nicht gefunden!")

print("\n" + "="*80)
print("ANALYSE ABGESCHLOSSEN")
print("="*80)
