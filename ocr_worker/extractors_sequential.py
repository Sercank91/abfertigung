"""
SEQUENZIELLE Code-Extraktion für EU-Zolldokumente
Geht Block für Block durch und sammelt alle Felder in der Reihenfolge
"""

import re
from typing import List, Dict, Optional, Tuple


def find_field_value(text: str, field_code: str, value_type: str = 'text') -> Optional[str]:
    """
    Findet den Wert NACH einem Feld-Code

    Args:
        text: Text-Block
        field_code: Feld-Code z.B. "(32)", "(33)", "(35)"
        value_type: 'number', 'text', 'weight', 'code'

    Returns:
        Gefundener Wert oder None
    """
    # Suche nach dem Feld-Code
    pattern = re.escape(field_code)
    match = re.search(pattern, text)

    if not match:
        return None

    # Nimm die nächsten 200 Zeichen nach dem Code
    start_pos = match.end()
    snippet = text[start_pos:start_pos + 200]

    # Extrahiere basierend auf Typ
    if value_type == 'number':
        # Suche erste Zahl (1-3 Ziffern)
        num_match = re.search(r'(\d{1,3})\b', snippet)
        return num_match.group(1) if num_match else None

    elif value_type == 'weight':
        # Suche Gewicht: X,Y oder X.Y
        weight_match = re.search(r'(\d+[.,]\d+)', snippet)
        if weight_match:
            return weight_match.group(1).replace(',', '.')
        return None

    elif value_type == 'code':
        # Suche 2-4 stelligen Code
        code_match = re.search(r'(\d{2,4})\b', snippet)
        return code_match.group(1) if code_match else None

    elif value_type == 'hs_code':
        # Suche 8-stellige Nummer
        hs_match = re.search(r'(\d{8})\b', snippet)
        return hs_match.group(1) if hs_match else None

    elif value_type == 'text':
        # Suche Text (buchstaben, auch mit Akzenten)
        # Überspringe erst Zahlen/Symbole, dann nimm Text
        text_match = re.search(r'[^\w\s]{0,20}([A-Za-zÀ-ÿéèêëàâôûçÉÈÊËÀÂÔÛÇ][\w\sÀ-ÿéèêëàâôûçÉÈÊËÀÂÔÛÇ\-]{4,80})', snippet)
        if text_match:
            result = text_match.group(1).strip()
            # Bereinige trailing OCR-Artefakte
            result = re.sub(r'\s*\d{8}\s*$', '', result)
            result = re.sub(r'\s+[A-Z]{2}\d+\s*$', '', result)
            return result
        return None

    return None


def extract_positions_sequential(text: str, debug: bool = True) -> List[Dict]:
    """
    SEQUENZIELLE Positions-Extraktion

    STRATEGIE:
    1. Finde alle (32) Marker → Start eines Positions-Blocks
    2. Für jeden Block: Gehe sequenziell durch und sammle ALLE Felder
    3. Keine komplexen Patterns, sondern "nimm was nach dem Code kommt"

    FELDER:
    - (32) = Position number
    - (31/2) = Description
    - (33) = HS code
    - (35) = Gross weight
    - (38) = Net weight
    - (37) = Procedure code
    """

    if debug:
        print("\n" + "="*80)
        print("🔍 DEBUG: SEQUENZIELLE EXTRAKTION")
        print("="*80)

    positions = []

    # SCHRITT 1: Finde alle (32) Marker
    marker_pattern = r'Art\.\s*No\s*\(32\)|\(32\)'
    markers = []

    for match in re.finditer(marker_pattern, text, re.IGNORECASE):
        markers.append(match.start())

    if debug:
        print(f"\n📊 {len(markers)} Position-Marker '(32)' gefunden")

    if not markers:
        if debug:
            print("⚠️  KEINE POSITIONEN GEFUNDEN")
        return []

    # SCHRITT 2: Verarbeite jeden Block sequenziell
    for i, marker_start in enumerate(markers):
        if debug:
            print(f"\n{'='*80}")
            print(f"📦 POSITION {i+1}")
            print(f"{'='*80}")

        # Block-Grenzen
        if i + 1 < len(markers):
            block_end = markers[i + 1]
        else:
            block_end = marker_start + 1500  # Letzter Block

        block = text[marker_start:block_end]

        if debug:
            print(f"Block: {marker_start} bis {block_end} ({len(block)} Zeichen)")
            print(f"Vorschau:\n{block[:250]}")
            print("-"*80)

        position = {
            'orderNumber': i + 1,  # Default
            'hsCode': None,
            'description': '',
            'netWeight': 0.0,
            'grossWeight': 0.0,
            'procedure': None,
            'procedureType': None,
            'value': None,
            'currency': None
        }

        # Sequenziell ALLE Felder extrahieren

        # 1. POSITIONSNUMMER aus (32)
        # SPEZIAL: Die Positionsnummer steht oft am Zeilenanfang NACH dem "(32)" Header
        # Beispiel FR: "Art. No (32) ...\n1 CT Générateurs"
        # Ignoriere Zahlen in Klammern wie "(31/2)"
        pos_num_pattern = r'(?:Art\.\s*No\s*\(32\)|\(32\))[^\n]*\n\s*(\d+)\s+(?:CT|COLIS)'
        pos_num_match = re.search(pos_num_pattern, block, re.IGNORECASE)
        if pos_num_match:
            pos_num = pos_num_match.group(1)
            position['orderNumber'] = int(pos_num)
            if debug:
                print(f"✓ (32) Positionsnummer: {pos_num} (aus Zeilenanfang)")
        else:
            # Fallback: Verwende Index
            position['orderNumber'] = i + 1
            if debug:
                print(f"⚠️  (32) Positionsnummer: Nicht gefunden, verwende {i+1}")

        # 2. BESCHREIBUNG aus (31/2)
        description = find_field_value(block, '(31/2)', 'text')
        if description:
            position['description'] = description[:200]
            if debug:
                print(f"✓ (31/2) Beschreibung: {description[:60]}...")
        else:
            # Fallback: Suche nach "CT" + Text
            ct_match = re.search(r'\d+\s+CT\s+([A-Za-zÀ-ÿéèêëàâôûç\s\-]{5,100})', block, re.IGNORECASE)
            if ct_match:
                description = ct_match.group(1).strip()
                position['description'] = description[:200]
                if debug:
                    print(f"✓ (31/2) Beschreibung (Fallback): {description[:60]}...")
            else:
                if debug:
                    print(f"✗ (31/2) Beschreibung: Nicht gefunden")

        # 3. HS-CODE aus (33)
        hs_code = find_field_value(block, '(33)', 'hs_code')
        if hs_code:
            position['hsCode'] = hs_code
            if debug:
                print(f"✓ (33) HS-Code: {hs_code}")
        else:
            # Fallback: Suche beliebige 8-stellige Nummer
            hs_fallback = re.search(r'\b(\d{8})\b', block)
            if hs_fallback:
                hs_code = hs_fallback.group(1)
                if hs_code.startswith(('84', '85', '39', '72', '73', '87', '90', '94', '95',
                                       '40', '48', '70', '76', '82', '83', '86', '88', '89')):
                    position['hsCode'] = hs_code
                    if debug:
                        print(f"✓ (33) HS-Code (Fallback): {hs_code}")
                else:
                    if debug:
                        print(f"✗ (33) HS-Code: {hs_code} ungültig")
            else:
                if debug:
                    print(f"✗ (33) HS-Code: Nicht gefunden")

        # 4. BRUTTOGEWICHT aus (35)
        gross_weight = find_field_value(block, '(35)', 'weight')
        if gross_weight:
            try:
                weight = float(gross_weight)
                if 0.01 <= weight <= 50000:
                    position['grossWeight'] = weight
                    if debug:
                        print(f"✓ (35) Bruttogewicht: {weight} kg")
                else:
                    if debug:
                        print(f"✗ (35) Bruttogewicht: {weight} kg außerhalb Bereich")
            except ValueError:
                if debug:
                    print(f"✗ (35) Bruttogewicht: Konvertierungsfehler '{gross_weight}'")
        else:
            if debug:
                print(f"✗ (35) Bruttogewicht: Nicht gefunden")

        # 5. NETTOGEWICHT aus (38)
        net_weight = find_field_value(block, '(38)', 'weight')
        if net_weight:
            try:
                weight = float(net_weight)
                if 0.01 <= weight <= 50000:
                    position['netWeight'] = weight
                    if debug:
                        print(f"✓ (38) Nettogewicht: {weight} kg")
                else:
                    if debug:
                        print(f"✗ (38) Nettogewicht: {weight} kg außerhalb Bereich")
            except ValueError:
                if debug:
                    print(f"✗ (38) Nettogewicht: Konvertierungsfehler '{net_weight}'")
        else:
            # Fallback: Verwende Bruttogewicht
            if position['grossWeight'] > 0:
                position['netWeight'] = position['grossWeight']
                if debug:
                    print(f"⚠️  (38) Nettogewicht: Verwende Bruttogewicht ({position['grossWeight']} kg)")
            else:
                if debug:
                    print(f"✗ (38) Nettogewicht: Nicht gefunden")

        # VALIDIERUNG: Falls Nettogewicht > Bruttogewicht, tausche sie
        # (OCR-Fehler oder Feld-Vertauschung)
        if position['netWeight'] > 0 and position['grossWeight'] > 0:
            if position['netWeight'] > position['grossWeight']:
                if debug:
                    print(f"⚠️  Gewichte vertauscht: Netto ({position['netWeight']}) > Brutto ({position['grossWeight']}), tausche!")
                position['netWeight'], position['grossWeight'] = position['grossWeight'], position['netWeight']

        # 6. VERFAHREN aus (37)
        proc_code = find_field_value(block, '(37)', 'code')
        if proc_code:
            # Filtere ungültige Codes (z.B. "35" von Feld 35)
            # Gültige Verfahren beginnen mit 1, 3, 4 (nicht 2, 5, 6, 7, 8, 9)
            if proc_code.startswith(('1', '31', '32', '40', '42', '51')):
                # Expandiere zu 4-stellig
                if len(proc_code) == 2:
                    proc_code = proc_code + '00'
                elif len(proc_code) == 3:
                    proc_code = proc_code + '0'

                position['procedure'] = proc_code

                # Klassifiziere
                if proc_code in ['1000', '1010', '1020', '1040']:
                    position['procedureType'] = 'Ausfuhr'
                elif proc_code in ['3171', '3151']:
                    position['procedureType'] = 'Versand'
                elif proc_code in ['4000', '4071']:
                    position['procedureType'] = 'Veredelung'

                if debug:
                    print(f"✓ (37) Verfahren: {proc_code} ({position['procedureType'] or 'Unknown'})")
            else:
                if debug:
                    print(f"✗ (37) Verfahren: {proc_code} ungültig (wahrscheinlich Feld-Nummer)")
        else:
            if debug:
                print(f"✗ (37) Verfahren: Nicht gefunden")

        positions.append(position)

    # Sortiere nach orderNumber
    positions.sort(key=lambda x: x['orderNumber'])

    if debug:
        print("\n" + "="*80)
        print(f"✅ SEQUENZIELLE EXTRAKTION ABGESCHLOSSEN")
        print(f"   {len(positions)} Positionen extrahiert")
        print("="*80 + "\n")

    return positions
