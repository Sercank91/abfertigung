"""
Smart OCR Data Extractors - Optimiert für Tabellen-OCR
Intelligente Extraktion trotz durcheinandergeratener Tabellenstruktur
"""

import re
from typing import Dict, List, Optional, Tuple


def extract_mrn(text: str) -> Optional[str]:
    """
    Extrahiert MRN (Movement Reference Number)
    Format: YYCCLLLLLLLLLLLLLLL (18 Zeichen: 2 Ziffern + 2 Buchstaben + 14 alphanumerisch)

    Sucht explizit nach "MRN" Keyword gefolgt von der Nummer
    """
    # Pattern: MRN gefolgt von der Nummer
    mrn_pattern = r'MRN\s*(\d{2}[A-Z]{2}[A-Z0-9]{14})\b'
    match = re.search(mrn_pattern, text)

    if match:
        return match.group(1)

    # Fallback: Suche ohne MRN Prefix
    mrn_pattern_fallback = r'\b(\d{2}[A-Z]{2}[A-Z0-9]{14})\b'
    match = re.search(mrn_pattern_fallback, text)
    return match.group(1) if match else None


def extract_sender_smart(text: str) -> Optional[Dict[str, str]]:
    """
    Intelligente Sender-Extraktion

    Sucht nach:
    1. DEUTAWERKE oder anderen Firmennamen
    2. [1] Marker (Anmelder/Vertreter Kennzeichnung)
    3. Deutsche Adressstruktur mit PLZ
    """
    sender = {
        'name': None,
        'address': None,
        'zip': None,
        'city': None,
        'country': None
    }

    # Suche nach [1] DEUTAWERKE Block
    marker_pattern = r'\[1\]\s*([A-Z][A-Za-zäöüÄÖÜß\s]+)'
    match = re.search(marker_pattern, text)

    if match:
        # Finde Position des Markers
        start = match.start()
        # Nimm die nächsten 200 Zeichen
        block = text[start:start+200]
        lines = block.split('\n')

        # Erste Zeile = Name
        if len(lines) > 0:
            name_line = lines[0].strip()
            # Entferne [1] und N.DE... Prefix
            name_line = re.sub(r'\[1\]\s*', '', name_line)
            name_line = re.sub(r'N\.DE\d+', '', name_line)
            sender['name'] = name_line.strip()

        # Suche nach Straße (enthält "Str" oder endet mit Nummer)
        for line in lines[1:]:
            line = line.strip()
            if 'str' in line.lower() or 'straße' in line.lower() or 'strasse' in line.lower():
                sender['address'] = line
                break

        # Suche nach PLZ + Stadt
        for line in lines:
            zip_city_match = re.search(r'\b(\d{5})\s+([A-Za-zäöüÄÖÜß\-]+)', line)
            if zip_city_match:
                sender['zip'] = zip_city_match.group(1)
                sender['city'] = zip_city_match.group(2).strip()
                break

        # Suche nach Ländercode
        for line in lines:
            if re.match(r'^[A-Z]{2}$', line.strip()):
                sender['country'] = line.strip()
                break

    return sender if sender['name'] else None


def extract_receiver_smart(text: str) -> Optional[Dict[str, str]]:
    """
    Intelligente Empfänger-Extraktion

    Sucht nach Empfänger (8) und türkischer Adresse
    """
    receiver = {
        'name': None,
        'address': None,
        'zip': None,
        'city': None,
        'country': None
    }

    # Suche nach "Empfänger (8)" oder "Destinataire (8)"
    pattern = r'(?:Empfänger|Destinataire)\s*\(8\)'
    match = re.search(pattern, text, re.IGNORECASE)

    if not match:
        # Fallback: Suche nach türkischer Adresse (Ankara, Istanbul, etc.)
        turkish_cities = ['Ankara', 'Istanbul', 'Izmir', 'Bursa', 'Antalya']
        for city in turkish_cities:
            if city in text:
                # Finde Block um diese Stadt
                city_pos = text.find(city)
                block_start = max(0, city_pos - 200)
                block = text[block_start:city_pos + 100]

                # Suche PLZ vor Stadt
                zip_match = re.search(r'\b(\d{5})\s+' + city, block)
                if zip_match:
                    receiver['zip'] = zip_match.group(1)
                    receiver['city'] = city
                    receiver['country'] = 'TR'

                    # Suche nach Straße (Caddesi, Sokak)
                    address_match = re.search(r'([A-Za-zığüşöçİĞÜŞÖÇ\s]+(?:Caddesi|Sokak|Bulvarı)[^0-9]*\d+[^A-Z]*)', block)
                    if address_match:
                        receiver['address'] = address_match.group(1).strip()

                    # Suche nach Firmenname (vor der Adresse)
                    lines = block.split('\n')
                    for i, line in enumerate(lines):
                        if 'Ltd' in line or 'Sti' in line or 'A.S' in line or 'A.Ş' in line:
                            receiver['name'] = line.strip()
                            break

                    break

    return receiver if receiver['city'] else None


def extract_hs_codes_smart(text: str) -> List[str]:
    """
    Intelligente HS-Code Extraktion

    Filtert echte 8-stellige HS-Codes von False Positives wie:
    - Daten (2024, 08:39)
    - Procedure Codes (1000, 1010)
    - Seitenzahlen
    """
    hs_codes = []

    # Suche nach 8-stelligen Zahlen (echte HS-Codes)
    pattern_8digit = r'\b(\d{8})\b'
    matches = re.findall(pattern_8digit, text)

    for code in matches:
        # Filtere False Positives
        # Keine Daten (beginnt mit 19xx oder 20xx)
        if code.startswith('19') or code.startswith('20'):
            continue

        # Keine Uhrzeiten (endet mit große Endziffern)
        if code.endswith('0000') or code.endswith('9999'):
            continue

        # HS-Codes beginnen oft mit 0-9 und haben Varianz
        # Typische Starts: 84, 85, 39, 72, 73
        if code[0:2] in ['84', '85', '39', '72', '73', '87', '90', '94', '95']:
            hs_codes.append(code)

    # Suche auch nach Codes mit Punkten: 8471.70.98
    pattern_dots = r'\b(\d{4}\.\d{2}(?:\.\d{2})?)\b'
    matches_dots = re.findall(pattern_dots, text)

    for code in matches_dots:
        # Konvertiere zu 8-stellig ohne Punkte
        code_clean = code.replace('.', '')
        if len(code_clean) >= 6 and code_clean not in hs_codes:
            # Fülle auf 8 Stellen auf
            code_clean = code_clean.ljust(8, '0')
            hs_codes.append(code_clean)

    return list(set(hs_codes))  # Deduplizieren


def extract_total_gross_weight_smart(text: str) -> Optional[float]:
    """
    Extrahiert Rohmasse (kg) - sucht nach (35) oder größeren Gewichtsangaben
    """
    # Suche nach "Rohmasse (kg) (35)" oder "(35)" gefolgt von Zahl
    pattern1 = r'Rohmasse.*?\(35\)[^\d]*(\d+[.,]\d+)'
    match = re.search(pattern1, text, re.IGNORECASE)

    if match:
        weight_str = match.group(1).replace(',', '.')
        try:
            return float(weight_str)
        except ValueError:
            pass

    # Fallback: Suche nach größeren Gewichten (> 10 kg)
    pattern2 = r'\b(\d+[.,]\d{3})\s*(?:kg|KG)'
    matches = re.findall(pattern2, text, re.IGNORECASE)

    for weight_str in matches:
        weight_str = weight_str.replace(',', '.')
        try:
            weight = float(weight_str)
            if weight > 10:  # Totalgewicht ist meist > 10kg
                return weight
        except ValueError:
            continue

    return None


def extract_positions_smart(text: str, hs_codes: List[str]) -> List[Dict]:
    """
    Intelligente Positions-Extraktion

    Für jeden HS-Code:
    1. Finde die Position im Text
    2. Suche nach Beschreibung in der Nähe
    3. Suche nach Gewicht in der Nähe
    4. Suche nach Procedure Code
    """
    positions = []

    # Splitze Text in Seiten
    pages = text.split('=== NEUE SEITE ===')

    for hs_code in hs_codes:
        # Finde alle Vorkommen dieses HS-Codes
        for page in pages:
            if hs_code in page:
                # Finde Position des HS-Codes
                hs_pos = page.find(hs_code)

                # Extrahiere Block um den HS-Code (±200 Zeichen)
                block_start = max(0, hs_pos - 100)
                block_end = min(len(page), hs_pos + 300)
                block = page[block_start:block_end]

                position = {
                    'orderNumber': len(positions) + 1,
                    'hsCode': hs_code,
                    'description': '',
                    'netWeight': 0.0,
                    'grossWeight': 0.0,
                    'procedure': None,
                    'procedureType': None,
                    'value': None,
                    'currency': None
                }

                # Suche nach Beschreibung (längere Texte mit Substantiven)
                # Typische Beschreibungen: "Verbindungselemente für...", "Kabel elektrische..."
                desc_patterns = [
                    r'([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöüß]+){2,}(?:\s+[a-zäöüß]+)?)',  # Deutsche Substantive
                    r'(für\s+[A-Za-zäöü]+(?:\s+[a-zäöü]+){1,3})',  # "für X und Y"
                ]

                for pattern in desc_patterns:
                    matches = re.findall(pattern, block)
                    if matches:
                        # Nimm längste Beschreibung
                        desc = max(matches, key=len)
                        if len(desc) > len(position['description']):
                            position['description'] = desc[:200]

                # Suche nach Gewicht (kleinere Zahlen, meist < 20 kg für Positionen)
                weight_pattern = r'\b(\d+[.,]\d{1,2})\b'
                weight_matches = re.findall(weight_pattern, block)

                for weight_str in weight_matches:
                    weight_str = weight_str.replace(',', '.')
                    try:
                        weight = float(weight_str)
                        # Positionsgewichte sind meist < 50 kg
                        if 0.1 < weight < 50:
                            position['netWeight'] = weight
                            break
                    except ValueError:
                        continue

                # Suche nach Procedure Code (1000, 1010, etc.)
                procedure_codes = ['1000', '1010', '1020', '1040', '3171', '3151', '4000', '4071']
                for code in procedure_codes:
                    if code in block:
                        position['procedure'] = code
                        # Klassifiziere Typ
                        if code in ['1000', '1010', '1020', '1040']:
                            position['procedureType'] = 'T2'
                        elif code in ['3171', '3151']:
                            position['procedureType'] = 'T1'
                        break

                positions.append(position)
                break  # Nur erste Vorkommen pro HS-Code nehmen

    return positions


def extract_total_packages(text: str) -> Optional[int]:
    """
    Extrahiert Packstücke insgesamt (6)
    """
    # Suche nach (6) gefolgt von Zahl
    pattern = r'\(6\)[^\d]*(\d+)'
    match = re.search(pattern, text)

    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass

    # Fallback: Suche nach "Packstücke"
    pattern2 = r'Packst.*?insgesamt[^\d]*(\d+)'
    match = re.search(pattern2, text, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass

    return None


def extract_countries_smart(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extrahiert Versendungsland und Bestimmungsland

    Returns:
        (origin_country, destination_country)
    """
    # Suche nach DE ... TR Pattern (typisch für Deutschland → Türkei)
    country_pattern = r'\b([A-Z]{2})\s+(?:al\s+)?([A-Z]{2})\b'
    matches = re.findall(country_pattern, text)

    origin = None
    destination = None

    # Häufigste Länder-Kombination nehmen
    if matches:
        # DE als Ursprung ist sehr wahrscheinlich
        for c1, c2 in matches:
            if c1 == 'DE':
                origin = c1
                destination = c2
                break

    # Fallback: Suche nach einzelnen Ländercodes
    if not origin:
        if 'DE' in text:
            origin = 'DE'

    if not destination:
        # Suche nach anderen Ländercodes (nicht DE)
        other_countries = ['TR', 'AT', 'FR', 'IT', 'NL', 'BE', 'PL', 'CZ']
        for country in other_countries:
            if country in text and country != origin:
                destination = country
                break

    return (origin, destination)


def detect_document_type(text: str) -> str:
    """
    Erkennt Dokumententyp
    """
    text_lower = text.lower()

    if 'ex1' in text_lower or 'ausfuhranmeldung' in text_lower or 'ausfuhrbegleitdokument' in text_lower:
        return 'EX1'
    elif 'n821' in text_lower:
        return 'N821'
    elif 't1' in text_lower and 'begleitdokument' in text_lower:
        return 'T1'
    elif 'invoice' in text_lower or 'rechnung' in text_lower:
        return 'Invoice'
    else:
        return 'EX1'  # Default für EU-Ausfuhrdokumente


def classify_procedure_type_smart(positions: List[Dict]) -> str:
    """
    Klassifiziert Gesamtverfahren basierend auf Positionen
    """
    if not positions:
        return 'Unknown'

    types = set()
    for pos in positions:
        if pos.get('procedureType'):
            types.add(pos['procedureType'])

    if len(types) == 0:
        return 'Unknown'
    elif len(types) == 1:
        return list(types)[0]
    else:
        return 'T-'  # Mixed


def optimize_addresses(positions: List[Dict]) -> Tuple[Optional[Dict], Optional[Dict], List[Dict]]:
    """
    Optimiert Adressen: Common vs Individual
    """
    # Für EX1 Dokumente haben wir meist gemeinsame Adressen
    # Individual addresses sind in positions meist None
    return (None, None, positions)
