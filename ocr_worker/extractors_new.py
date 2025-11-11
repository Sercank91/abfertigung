"""
OCR Data Extractors - Feldnummern-basiert
Extraktion von Zolldokument-Feldern anhand der standardisierten Feldnummern
"""

import re
from typing import Dict, List, Optional, Tuple


def extract_field_value(text: str, field_number: str, lines_after: int = 5) -> Optional[str]:
    """
    Extrahiert den Wert eines Feldes anhand der Feldnummer in Klammern

    Args:
        text: OCR-Text
        field_number: Feldnummer ohne Klammern (z.B. "2", "8", "35")
        lines_after: Anzahl der Zeilen nach der Feldnummer, die extrahiert werden sollen

    Returns:
        Extrahierter Wert oder None
    """
    # Suche nach Feldnummer in Klammern
    pattern = rf'\({field_number}\)'
    match = re.search(pattern, text)

    if not match:
        return None

    # Finde Position der Feldnummer
    start_pos = match.end()

    # Extrahiere Text nach der Feldnummer (bis zu N Zeilen)
    remaining_text = text[start_pos:]
    lines = remaining_text.split('\n')[:lines_after]

    # Bereinige und kombiniere Zeilen
    value_lines = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith('('):  # Stoppt bei nächster Feldnummer
            value_lines.append(line)
        elif line.startswith('('):  # Nächstes Feld erreicht
            break

    return '\n'.join(value_lines) if value_lines else None


def extract_mrn(text: str) -> Optional[str]:
    """
    Extrahiert MRN (Movement Reference Number) aus Text
    Format: YYCCLLLLLLLLLLLLLLL (18 Zeichen: 2 Ziffern + 2 Buchstaben + 14 alphanumerisch)

    Beispiele:
    - 24DE715732714963B6
    - 25NLBRHOG51LW45DA5
    """
    # MRN Pattern: YYCCxxxxxxxxxxxxxxxxx (18 Zeichen total)
    # Suche explizit nach "MRN" gefolgt von der Nummer
    mrn_pattern = r'MRN\s*(\d{2}[A-Z]{2}[A-Z0-9]{14})\b'
    match = re.search(mrn_pattern, text)

    if match:
        return match.group(1)

    # Fallback: Suche nach dem Pattern ohne "MRN" Prefix
    mrn_pattern_fallback = r'\b(\d{2}[A-Z]{2}[A-Z0-9]{14})\b'
    match = re.search(mrn_pattern_fallback, text)
    return match.group(1) if match else None


def extract_sender(text: str) -> Optional[Dict[str, str]]:
    """
    Extrahiert Versender/Ausführer anhand Feldnummer (2)

    Returns:
        Dict mit {name, address, zip, city, country}
    """
    sender_text = extract_field_value(text, "2", lines_after=6)

    if not sender_text:
        return None

    lines = [l.strip() for l in sender_text.split('\n') if l.strip()]

    if not lines:
        return None

    # Erste Zeile = Name
    name = lines[0] if len(lines) > 0 else None

    # Suche nach PLZ + Stadt Pattern
    address = None
    zip_code = None
    city = None
    country = None

    for i, line in enumerate(lines[1:], 1):
        # PLZ + Stadt Pattern: "12345 Stadt" oder "D-12345 Stadt"
        zip_city_match = re.search(r'([A-Z]{0,2}-?\d{4,6})\s+([A-Za-zäöüÄÖÜß\-\s]+)', line)
        if zip_city_match and not zip_code:
            zip_code = zip_city_match.group(1)
            city = zip_city_match.group(2).strip()
            continue

        # Ländercode am Ende: "DE", "TR", "NL" (2 Buchstaben)
        country_match = re.search(r'\b([A-Z]{2})\b\s*$', line)
        if country_match:
            country = country_match.group(1)
            continue

        # Sonst ist es Teil der Adresse (Straße)
        if not address and not zip_city_match:
            address = line

    return {
        'name': name,
        'address': address,
        'zip': zip_code,
        'city': city,
        'country': country
    }


def extract_receiver(text: str) -> Optional[Dict[str, str]]:
    """
    Extrahiert Empfänger anhand Feldnummer (8)

    Returns:
        Dict mit {name, address, zip, city, country}
    """
    receiver_text = extract_field_value(text, "8", lines_after=6)

    if not receiver_text:
        return None

    lines = [l.strip() for l in receiver_text.split('\n') if l.strip()]

    if not lines:
        return None

    # Gleiche Logik wie bei Sender
    name = lines[0] if len(lines) > 0 else None

    address = None
    zip_code = None
    city = None
    country = None

    for i, line in enumerate(lines[1:], 1):
        zip_city_match = re.search(r'([A-Z]{0,2}-?\d{4,6})\s+([A-Za-zäöüÄÖÜß\-\s]+)', line)
        if zip_city_match and not zip_code:
            zip_code = zip_city_match.group(1)
            city = zip_city_match.group(2).strip()
            continue

        country_match = re.search(r'\b([A-Z]{2})\b\s*$', line)
        if country_match:
            country = country_match.group(1)
            continue

        if not address and not zip_city_match:
            address = line

    return {
        'name': name,
        'address': address,
        'zip': zip_code,
        'city': city,
        'country': country
    }


def extract_total_packages(text: str) -> Optional[int]:
    """
    Extrahiert Packstücke insgesamt anhand Feldnummer (6)
    """
    packages_text = extract_field_value(text, "6", lines_after=1)

    if not packages_text:
        return None

    # Suche nach Zahl
    match = re.search(r'(\d+)', packages_text)
    return int(match.group(1)) if match else None


def extract_total_gross_weight(text: str) -> Optional[float]:
    """
    Extrahiert Rohmasse (kg) anhand Feldnummer (35)
    """
    weight_text = extract_field_value(text, "35", lines_after=1)

    if not weight_text:
        return None

    # Suche nach Zahl (mit Komma oder Punkt)
    match = re.search(r'(\d+[.,]?\d*)', weight_text)
    if match:
        weight_str = match.group(1).replace(',', '.')
        try:
            return float(weight_str)
        except ValueError:
            return None

    return None


def extract_origin_country(text: str) -> Optional[str]:
    """
    Extrahiert Versendungsland anhand Feldnummer (15)
    """
    country_text = extract_field_value(text, "15", lines_after=1)

    if not country_text:
        return None

    # Suche nach 2-Buchstaben Ländercode
    match = re.search(r'\b([A-Z]{2})\b', country_text)
    return match.group(1) if match else None


def extract_destination_country(text: str) -> Optional[str]:
    """
    Extrahiert Bestimmungsland anhand Feldnummer (17)
    """
    country_text = extract_field_value(text, "17", lines_after=1)

    if not country_text:
        return None

    # Suche nach 2-Buchstaben Ländercode
    match = re.search(r'\b([A-Z]{2})\b', country_text)
    return match.group(1) if match else None


def extract_page_count(text: str) -> Optional[int]:
    """
    Extrahiert Anzahl der Vordrucke (Seiten) anhand Feldnummer (3)
    """
    pages_text = extract_field_value(text, "3", lines_after=1)

    if not pages_text:
        return None

    # Suche nach Zahl
    match = re.search(r'(\d+)', pages_text)
    return int(match.group(1)) if match else None


def extract_hs_codes(text: str) -> List[str]:
    """
    Extrahiert HS-Codes aus dem Text
    Format: 8471.30, 3926.90.92, 84717098, etc.

    HS-Codes sind normalerweise in Position (5), aber wir suchen im ganzen Text
    """
    # HS-Code Pattern: 4-10 Ziffern, optional mit Punkten getrennt
    hs_pattern = r'\b(\d{4}(?:\.\d{2})?(?:\.\d{2})?)\b'
    matches = re.findall(hs_pattern, text)

    # Filter: Nur Codes mit 4-10 Ziffern (ohne Punkte gezählt)
    valid_hs_codes = []
    for match in matches:
        digits_only = match.replace('.', '')
        # Muss zwischen 4 und 10 Ziffern haben
        if 4 <= len(digits_only) <= 10:
            # Filtere bekannte False Positives aus (z.B. Daten, Uhrzeiten)
            # Keine Codes die wie Datum aussehen (z.B. 2024, 0824)
            if not (len(digits_only) == 4 and (digits_only.startswith('19') or digits_only.startswith('20'))):
                valid_hs_codes.append(match)

    # Deduplizieren
    return list(set(valid_hs_codes))


def extract_procedure_codes(text: str) -> List[str]:
    """
    Extrahiert Procedure Codes (z.B. 1010, 1020, 3171, 3151)
    Diese stehen oft im Verfahrens-Feld
    """
    known_procedures = ['1000', '1010', '1020', '1040', '3171', '3151', '4000', '4071']
    found_codes = []

    for code in known_procedures:
        if code in text:
            found_codes.append(code)

    return list(set(found_codes))


def classify_procedure_type(procedure_codes: List[str]) -> str:
    """
    Klassifiziert T1/T2/T- basierend auf Procedure Codes

    Regeln:
    - 1000, 1010, 1020, 1040 = T2 (EU-Waren)
    - 3171, 3151 = T1 (Nicht-EU-Waren)
    - Gemischt = T- (Mixed)
    """
    if not procedure_codes:
        return 'Unknown'

    t2_codes = {'1000', '1010', '1020', '1040'}
    t1_codes = {'3171', '3151'}

    has_t2 = any(code in t2_codes for code in procedure_codes)
    has_t1 = any(code in t1_codes for code in procedure_codes)

    if has_t2 and has_t1:
        return 'T-'  # Gemischt
    elif has_t2:
        return 'T2'
    elif has_t1:
        return 'T1'
    else:
        return 'Unknown'


def detect_document_type(text: str) -> str:
    """
    Erkennt Dokumententyp (EX1, T1, N821, Invoice)
    """
    text_lower = text.lower()

    if 'ex1' in text_lower or 'ausfuhranmeldung' in text_lower or 'ausfuhrbegleitdokument' in text_lower:
        return 'EX1'
    elif 'n821' in text_lower or 't1' in text_lower:
        return 'T1'
    elif 'invoice' in text_lower or 'rechnung' in text_lower:
        return 'Invoice'
    else:
        return 'Unknown'


def parse_positions_table(text: str) -> List[Dict]:
    """
    Versucht Positionen-Tabelle zu parsen

    Sucht nach:
    - HS-Codes
    - Warenbeschreibung (Text nach HS-Code)
    - Gewichte
    - Procedure Codes

    Returns:
        Liste von Dicts mit {orderNumber, hsCode, description, netWeight, ...}
    """
    positions = []

    # Teile Text in Zeilen
    lines = text.split('\n')

    # Suche nach Zeilen mit HS-Codes
    for i, line in enumerate(lines):
        # Suche nach HS-Code Pattern in der Zeile
        hs_match = re.search(r'\b(\d{4}(?:\.\d{2})?(?:\.\d{2})?)\b', line)

        if hs_match:
            hs_code = hs_match.group(1)

            # Prüfe ob es ein gültiger HS-Code ist (4-10 Ziffern)
            digits_only = hs_code.replace('.', '')
            if not (4 <= len(digits_only) <= 10):
                continue

            # Erstelle Position
            position_data = {
                'orderNumber': len(positions) + 1,
                'hsCode': hs_code,
                'description': '',
                'netWeight': 0.0,
                'grossWeight': 0.0,
                'procedure': None,
                'value': None,
                'currency': None
            }

            # Suche nach Gewicht in der Zeile oder den nächsten Zeilen
            weight_match = re.search(r'(\d+[.,]\d+|\d+)\s*kg', line, re.IGNORECASE)
            if weight_match:
                weight_str = weight_match.group(1).replace(',', '.')
                try:
                    position_data['netWeight'] = float(weight_str)
                except ValueError:
                    pass

            # Suche nach Procedure Code in der Zeile
            procedure_codes = extract_procedure_codes(line)
            if procedure_codes:
                position_data['procedure'] = procedure_codes[0]
                position_data['procedureType'] = classify_procedure_type(procedure_codes)

            # Extrahiere Beschreibung: Text zwischen HS-Code und Gewicht
            # Oder nimm die nächste Zeile als Beschreibung
            desc_parts = line.split(hs_code)
            if len(desc_parts) > 1:
                desc = desc_parts[1]
                # Entferne Gewicht aus Beschreibung
                desc = re.sub(r'\d+[.,]?\d*\s*kg', '', desc, flags=re.IGNORECASE)
                desc = desc.strip()
                if desc and len(desc) > 3:
                    position_data['description'] = desc[:200]  # Max 200 Zeichen

            # Falls keine Beschreibung, nimm nächste Zeile
            if not position_data['description'] and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line and not re.match(r'^\d', next_line):  # Nicht wenn nächste Zeile mit Zahl beginnt
                    position_data['description'] = next_line[:200]

            positions.append(position_data)

    return positions


def optimize_addresses(positions: List[Dict]) -> Tuple[Optional[Dict], Optional[Dict], List[Dict]]:
    """
    Optimiert Adressen: Common vs Individual

    Regel: Wenn ALLE Positionen die gleichen Sender/Empfänger haben,
           verwende commonSender/commonReceiver. Sonst individual.

    Returns:
        (commonSender, commonReceiver, positions_with_individual_addresses)
    """
    if not positions:
        return (None, None, positions)

    # Sammle alle einzigartigen Sender und Empfänger
    senders = set()
    receivers = set()

    for pos in positions:
        sender = pos.get('sender')
        receiver = pos.get('receiver')

        if sender:
            sender_str = f"{sender.get('name')}|{sender.get('address')}|{sender.get('city')}"
            senders.add(sender_str)

        if receiver:
            receiver_str = f"{receiver.get('name')}|{receiver.get('address')}|{receiver.get('city')}"
            receivers.add(receiver_str)

    # Wenn nur 1 einzigartiger Sender/Empfänger → common
    common_sender = None
    common_receiver = None

    if len(senders) == 1:
        common_sender = positions[0].get('sender')
        for pos in positions:
            pos['sender'] = None

    if len(receivers) == 1:
        common_receiver = positions[0].get('receiver')
        for pos in positions:
            pos['receiver'] = None

    return (common_sender, common_receiver, positions)
