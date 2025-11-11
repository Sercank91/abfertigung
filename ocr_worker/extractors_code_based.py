"""
CODE-BASIERTE OCR-Extraktion für EU-Zolldokumente
Universelle Extraktion basierend auf Zoll-Feld-Codes, nicht auf Keywords

Funktioniert für ALLE EU-Länder: DE, FR, BE, NL, IT, ES, etc.
"""

import re
from typing import List, Dict, Optional


def extract_positions_code_based(text: str, debug: bool = True) -> List[Dict]:
    """
    UNIVERSELLE Positions-Extraktion basierend auf EU-Zoll-Feld-Codes

    STRATEGIE:
    1. Suche nach Positions-Markern: "Art. No (32)" oder "(32)"
    2. Extrahiere Block für jede Position
    3. In jedem Block: Suche nach Feld-Codes (33), (35), (38), (37)

    Zoll-Feld-Codes (EU-Standard):
    - (32) = Artikel-Nummer / Position
    - (31/2) = Warenbeschreibung
    - (33) = HS-Code / Warennummer
    - (35) = Masse brute / Bruttogewicht (kg)
    - (38) = Masse nette / Nettogewicht (kg)
    - (37) = Procedure / Verfahren
    - (2) = Expéditeur / Versender
    - (8) = Destinataire / Empfänger
    - (15a) = Pays d'export / Ursprungsland
    - (17a) = Pays de destin / Bestimmungsland

    Funktioniert für:
    - Deutsche Ausfuhren (EX1, T1)
    - Französische Ausfuhren
    - Alle EU-Länder
    - Mit oder ohne "CT", "Karton", etc.
    """

    if debug:
        print("\n" + "="*80)
        print("🔍 DEBUG: CODE-BASIERTE POSITIONS-EXTRAKTION")
        print("="*80)

    positions = []

    # SCHRITT 1: Finde alle Positions-Marker "(32)"
    # Pattern: "Art. No (32)" oder einfach "(32)" am Zeilenanfang
    position_pattern = r'Art\.\s*No\s*\(32\)|^\s*\(32\)'

    position_markers = []
    for match in re.finditer(position_pattern, text, re.MULTILINE | re.IGNORECASE):
        position_markers.append({
            'start': match.start(),
            'end': match.end()
        })

    if debug:
        print(f"\n📊 {len(position_markers)} Position-Marker '(32)' gefunden")

    if not position_markers:
        if debug:
            print("⚠️  KEINE POSITIONEN GEFUNDEN!")
            print("   Suche nach '(32)' oder 'Art. No (32)' fehlgeschlagen")
            print("   Erste 500 Zeichen:")
            print("   " + text[:500].replace('\n', '\n   '))
        return []

    # SCHRITT 2: Extrahiere Daten für jede Position
    for i, marker in enumerate(position_markers):
        if debug:
            print(f"\n{'='*80}")
            print(f"📦 POSITION {i+1} (Marker an Position {marker['start']})")
            print(f"{'='*80}")

        # Block-Grenzen: Von diesem Marker bis zum nächsten oder +2000 Zeichen
        block_start = marker['start']
        if i + 1 < len(position_markers):
            block_end = position_markers[i + 1]['start']
        else:
            block_end = block_start + 2000

        block = text[block_start:block_end]

        if debug:
            print(f"Block-Länge: {len(block)} Zeichen")
            print(f"Block-Vorschau (erste 300 Zeichen):")
            print("   " + block[:300].replace('\n', '\n   '))
            print("-"*80)

        position = {
            'orderNumber': i + 1,  # Wird später überschrieben falls gefunden
            'hsCode': None,
            'description': '',
            'netWeight': 0.0,
            'grossWeight': 0.0,
            'procedure': None,
            'procedureType': None,
            'value': None,
            'currency': None
        }

        # 1. POSITIONSNUMMER: Nach (32) kommt die Nummer (kann in nächster Zeile sein)
        # Pattern: Nach "Art. No (32)" in den nächsten 50 Zeichen eine Ziffer
        pos_num_pattern = r'(?:Art\.\s*No\s*\(32\)|\(32\))[^\d]{0,50}?(\d+)'
        pos_num_match = re.search(pos_num_pattern, block[:200], re.IGNORECASE | re.DOTALL)
        if pos_num_match:
            position['orderNumber'] = int(pos_num_match.group(1))
            if debug:
                print(f"✓ Positionsnummer: {position['orderNumber']}")
        else:
            if debug:
                print(f"⚠️  Positionsnummer: Nicht gefunden, verwende Index {i+1}")

        # 2. WARENBESCHREIBUNG: Nach (31/2) in den nächsten Zeilen
        # Pattern: (31/2) gefolgt von Text (kann Zeilenumbrüche enthalten)
        desc_patterns = [
            r'\(31/2\)\s*\n?\s*\d+\s+[A-Z]+.*?\s+([A-Za-zÀ-ÿéèêëàâôûç\s\-]{5,100})',  # Mit Nummer davor
            r'\(31/2\)[^\n]*\n\s*\d+\s+\w+\s+([A-Za-zÀ-ÿéèêëàâôûç\s\-]{5,100})',  # Nächste Zeile
            r'\d+\s+CT\s+([A-Za-zÀ-ÿéèêëàâôûç\s\-]{5,100})',  # Nach "X CT"
            r'\d+\s+COLIS\s+([A-Za-zÀ-ÿéèêëàâôûç\s\-]{5,100})',  # Nach "X COLIS"
        ]

        for pattern in desc_patterns:
            desc_match = re.search(pattern, block[:400], re.IGNORECASE)
            if desc_match:
                description = desc_match.group(1).strip()
                # Bereinige OCR-Artefakte
                description = re.sub(r'\s*\d{8}\s*$', '', description)
                description = re.sub(r'\s+[A-Z]{2}\d+\s*$', '', description)
                description = re.sub(r'^\s*[\|\-_]+\s*', '', description)  # Entferne Pipes/Striche
                position['description'] = description[:200].strip()
                if debug:
                    print(f"✓ Beschreibung: {position['description'][:80]}")
                break

        if not position['description'] and debug:
            print(f"✗ Beschreibung: Nicht gefunden")

        # 3. HS-CODE: Nach (33) kommt der HS-Code
        # Pattern: (33) gefolgt von 8-stelliger Nummer
        hs_pattern = r'\(33\)\s*(\d{8})'
        hs_match = re.search(hs_pattern, block)
        if hs_match:
            hs_code = hs_match.group(1)
            position['hsCode'] = hs_code
            if debug:
                print(f"✓ HS-Code: {hs_code} (aus Feld 33)")
        else:
            # Fallback: Suche nach 8-stelliger Nummer im Block
            hs_fallback = r'\b(\d{8})\b'
            hs_match_fb = re.search(hs_fallback, block)
            if hs_match_fb:
                hs_code = hs_match_fb.group(1)
                # Filtere typische HS-Code-Anfänge
                if hs_code.startswith(('84', '85', '39', '72', '73', '87', '90', '94', '95',
                                       '40', '48', '70', '76', '82', '83', '86', '88', '89')):
                    position['hsCode'] = hs_code
                    if debug:
                        print(f"✓ HS-Code: {hs_code} (Fallback)")
                else:
                    if debug:
                        print(f"✗ HS-Code: {hs_code} (verworfen, ungültiger Anfang)")
            else:
                if debug:
                    print(f"✗ HS-Code: Nicht gefunden")

        # 4. BRUTTOGEWICHT: Nach (35) kommt Masse brute
        # Pattern: (35) gefolgt von Zahl (kann in nächster Zeile sein)
        gross_weight_patterns = [
            r'\(35\)\s*\n?\s*(\d+[.,]\d+)',  # Direkt oder nächste Zeile
            r'Masse brute[^\d]*\(35\)[^\d]{0,50}?(\d+[.,]\d+)',  # Mit Label
            r'\|\s*\-\-\-\s*\|\s*\-\-\-\s*(\d+[.,]\d+)',  # Vor dem Gewicht
        ]

        for pattern in gross_weight_patterns:
            gross_match = re.search(pattern, block, re.IGNORECASE)
            if gross_match:
                weight_str = gross_match.group(1).replace(',', '.')
                try:
                    weight = float(weight_str)
                    if 0.01 <= weight <= 50000:
                        position['grossWeight'] = weight
                        if debug:
                            print(f"✓ Bruttogewicht: {weight} kg (aus Feld 35)")
                        break
                    else:
                        if debug:
                            print(f"✗ Bruttogewicht: {weight} kg außerhalb Bereich")
                except ValueError:
                    if debug:
                        print(f"✗ Bruttogewicht: Konvertierungsfehler '{weight_str}'")

        if position['grossWeight'] == 0.0 and debug:
            print(f"✗ Bruttogewicht: Nicht gefunden (Feld 35)")

        # 5. NETTOGEWICHT: Nach (38) kommt Masse nette
        net_weight_patterns = [
            r'\(38\)\s*\n?\s*(\d+[.,]\d+)',  # Direkt oder nächste Zeile
            r'Masse nette[^\d]*\(38\)[^\d]{0,50}?(\d+[.,]\d+)',  # Mit Label
        ]

        for pattern in net_weight_patterns:
            net_match = re.search(pattern, block, re.IGNORECASE)
            if net_match:
                weight_str = net_match.group(1).replace(',', '.')
                try:
                    weight = float(weight_str)
                    if 0.01 <= weight <= 50000:
                        position['netWeight'] = weight
                        if debug:
                            print(f"✓ Nettogewicht: {weight} kg (aus Feld 38)")
                        break
                    else:
                        if debug:
                            print(f"✗ Nettogewicht: {weight} kg außerhalb Bereich")
                except ValueError:
                    if debug:
                        print(f"✗ Nettogewicht: Konvertierungsfehler '{weight_str}'")

        if position['netWeight'] == 0.0:
            # Fallback: Verwende Bruttogewicht
            if position['grossWeight'] > 0:
                position['netWeight'] = position['grossWeight']
                if debug:
                    print(f"⚠️  Nettogewicht: Verwendet Bruttogewicht als Fallback")
            else:
                if debug:
                    print(f"✗ Nettogewicht: Nicht gefunden (Feld 38)")

        # 6. VERFAHREN: Nach (37) kommt Procedure Code
        # Pattern: (37) gefolgt von 2-4 stelligem Code (kann in nächster Zeile sein)
        procedure_patterns = [
            r'\(37\)\s*\n?\s*(\d{2,4})',  # Direkt oder nächste Zeile
            r'Procédure[^\d]*\(37\)[^\d]{0,50}?(\d{2,4})',  # Mit Label (französisch)
            r'Procedure[^\d]*\(37\)[^\d]{0,50}?(\d{2,4})',  # Mit Label (englisch)
        ]

        for pattern in procedure_patterns:
            proc_match = re.search(pattern, block, re.IGNORECASE)
            if proc_match:
                proc_code = proc_match.group(1)

                # Expandiere 2-stellig zu 4-stellig: 10 → 1000
                if len(proc_code) == 2:
                    proc_code = proc_code + '00'
                # Expandiere 3-stellig zu 4-stellig: 100 → 1000
                elif len(proc_code) == 3:
                    proc_code = proc_code + '0'

                position['procedure'] = proc_code

                # Klassifiziere Typ
                if proc_code in ['1000', '1010', '1020', '1040']:
                    position['procedureType'] = 'Ausfuhr'
                elif proc_code in ['3171', '3151']:
                    position['procedureType'] = 'Versand'
                elif proc_code in ['4000', '4071']:
                    position['procedureType'] = 'Veredelung'

                if debug:
                    print(f"✓ Verfahren: {proc_code} ({position['procedureType'] or 'Unknown'}) (aus Feld 37)")
                break

        if not position['procedure'] and debug:
            print(f"✗ Verfahren: Nicht gefunden (Feld 37)")

        positions.append(position)

    # Sortiere nach orderNumber
    positions.sort(key=lambda x: x['orderNumber'])

    if debug:
        print("\n" + "="*80)
        print(f"✅ CODE-BASIERTE EXTRAKTION ABGESCHLOSSEN")
        print(f"   {len(positions)} Positionen erfolgreich extrahiert")
        print("="*80 + "\n")

    return positions
