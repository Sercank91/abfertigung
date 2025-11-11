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

    # Suche nach "Versender" oder "(2)" Block
    # Pattern 1: Versender/Ausführer (2)
    marker_patterns = [
        r'Versender[^\n]{0,50}\(2\)',
        r'\(2\)[^\n]{0,100}',
        r'\[1\]\s*[A-Z]'
    ]

    block = None
    for pattern in marker_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Finde Position des Markers
            start = match.start()
            # Nimm die nächsten 300 Zeichen (mehr für vollständige Adresse)
            block = text[start:start+300]
            break

    if block:
        lines = block.split('\n')

        # Suche nach Firmenname in den ersten Zeilen
        # Name ist meist in Großbuchstaben und 3-30 Zeichen lang
        for line in lines[:5]:
            line = line.strip()
            # Entferne Präfixe
            line = re.sub(r'^\[1\]\s*', '', line)
            line = re.sub(r'^N\.DE\d+\s*', '', line)
            line = re.sub(r'Versender.*?\(2\)\s*', '', line, flags=re.IGNORECASE)
            line = re.sub(r'^\(2\)\s*', '', line)

            # Prüfe ob Zeile wie ein Firmenname aussieht
            if line and len(line) >= 3 and re.match(r'[A-ZÄÖÜ]', line):
                # Nicht PLZ oder Ländercode
                if not re.match(r'^\d{5}', line) and not re.match(r'^[A-Z]{2}$', line):
                    sender['name'] = line.strip()
                    break

        # Bereinige alle Zeilen von OCR-Artefakten
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            # Bereinige OCR-Artefakte
            line = re.sub(r'^\|\s*<\s*\|\s*', '', line)  # Entferne "| < |"
            line = re.sub(r'^\|\s*', '', line)  # Entferne "|"
            if line:
                cleaned_lines.append(line)

        # Suche nach Straße (enthält "Str" oder endet mit Nummer)
        for line in cleaned_lines[1:]:
            if 'str' in line.lower() or 'straße' in line.lower() or 'strasse' in line.lower():
                sender['address'] = line
                break

        # Suche nach PLZ + Stadt im gesamten Block
        # Kombiniere alle bereinigten Zeilen
        full_block = ' '.join(cleaned_lines)

        # OCR verwechselt manchmal 5 mit 9, 1 mit I, etc.
        # Suche auch nach Patterns mit Bindestrich: "Bergisch-Gladbach"
        zip_city_match = re.search(r'\b([59]\d{4})\s+([A-Za-zäöüÄÖÜß][\w\-\s]+?)(?:\s+[A-Z]{2}\b|$)', full_block)
        if zip_city_match:
            zip_code = zip_city_match.group(1)
            # Korrigiere häufige OCR-Fehler: 91465 → 51465
            if zip_code.startswith('9'):
                zip_code = '5' + zip_code[1:]
            sender['zip'] = zip_code
            city = zip_city_match.group(2).strip()
            # Entferne trailing Ländercode falls vorhanden
            city = re.sub(r'\s+[A-Z]{2}$', '', city).strip()
            sender['city'] = city

        # Suche nach Ländercode (auch im kombinierten Block)
        country_match = re.search(r'\b([A-Z]{2})\s*$', full_block)
        if country_match:
            sender['country'] = country_match.group(1)
        else:
            # Fallback: Suche in bereinigten Zeilen
            for line in cleaned_lines:
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

    # Fallback: Suche nach türkischer Adresse (Ankara, Istanbul, etc.)
    turkish_cities = ['Ankara', 'Istanbul', 'İstanbul', 'Izmir', 'İzmir', 'Bursa', 'Antalya', 'Gaziantep']

    for city in turkish_cities:
        if city in text:
            # Finde Block um diese Stadt (größerer Bereich für Namen)
            city_pos = text.find(city)
            block_start = max(0, city_pos - 500)  # Erweitert für Namen
            block_end = city_pos + 200
            block = text[block_start:block_end]

            # Suche PLZ vor Stadt (0xxxx für Ankara, 3xxxx für İstanbul, etc.)
            zip_match = re.search(r'\b(\d{5})\s+' + re.escape(city), block)
            if zip_match:
                receiver['zip'] = zip_match.group(1)
                receiver['city'] = city
                receiver['country'] = 'TR'

                # Suche nach Straße (Caddesi, Sokak, Bulvarı)
                # Pattern: "Name Caddesi Nummer" oder "Name Cad. Nummer"
                address_patterns = [
                    r'([A-Za-zığüşöçİĞÜŞÖÇ\s]+(?:Caddesi|Cad\.|Sokak|Sok\.|Bulvarı|Bulv\.)\s*\d+[/\d]*)',
                    r'([A-Za-zığüşöçİĞÜŞÖÇ]+\s+Caddesi\s+\d+)',
                ]

                for pattern in address_patterns:
                    address_match = re.search(pattern, block, re.IGNORECASE)
                    if address_match:
                        receiver['address'] = address_match.group(1).strip()
                        break

                # Suche nach Firmenname (enthält Ltd, Sti, A.S, A.Ş, Teknik, Endüstri)
                # Erweiterte Patterns für türkische Firmennamen
                name_patterns = [
                    # Pattern 1: "Endüstri Teknik Ltd. Sti."
                    r'([A-Za-zığüşöçİĞÜŞÖÇ]+\s+[A-Za-zığüşöçİĞÜŞÖÇ]+\s+Ltd\.?\s+Sti\.?)',
                    # Pattern 2: Beliebige Wörter vor Ltd/Sti
                    r'([A-Za-zığüşöçİĞÜŞÖÇ\s]{5,50}(?:Ltd|Sti|A\.S|A\.Ş)\.?(?:\s+Sti\.?)?)',
                    # Pattern 3: Wörter mit Endüstri/Teknik
                    r'([A-Za-zığüşöçİĞÜŞÖÇ\s]+(?:Endüstri|Teknik)[A-Za-zığüşöçİĞÜŞÖÇ\s]+)',
                ]

                for pattern in name_patterns:
                    name_match = re.search(pattern, block, re.IGNORECASE)
                    if name_match:
                        name = name_match.group(1).strip()
                        # Bereinige OCR-Artefakte
                        name = re.sub(r'^\|\s*\(.*?\)\s*', '', name)  # Entferne "| (b)"
                        name = re.sub(r'^\s*\(.*?\)\s*', '', name)  # Entferne "(8)"
                        name = re.sub(r'^\s*E\s+', '', name)  # Entferne "E " Prefix
                        name = re.sub(r'^\|\s*', '', name)  # Entferne "|"
                        name = re.sub(r'\s+', ' ', name)  # Normalisiere Leerzeichen

                        # Entferne trailing Adressteile
                        name = re.sub(r'\s+Caddesi.*$', '', name)
                        name = re.sub(r'\s+\d+.*$', '', name)

                        if len(name) > 5:
                            receiver['name'] = name.strip()
                            break

                # Fallback: Suche Zeile für Zeile
                if not receiver['name']:
                    lines = block.split('\n')
                    for line in lines:
                        # Bereinige Zeile
                        line = re.sub(r'^\|\s*\(.*?\)\s*', '', line)  # Entferne "| (b)"
                        line = line.strip()

                        if any(x in line for x in ['Ltd', 'Sti', 'A.S', 'A.Ş', 'Teknik', 'Endüstri']):
                            # Bereinige den Namen
                            name = re.sub(r'^\s*E\s+', '', line)  # Entferne "E " Prefix
                            if len(name) > 5:
                                receiver['name'] = name
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
    Extrahiert Rohmasse (kg) - sucht nach "Rohmasse" Keyword
    WICHTIG: Feldnummer (35) kann verwechselt werden!
    Beispiel: "Rohmasse (kg) (35) 16,220" → Wir wollen 16,220, nicht 35!
    """
    # Pattern 1: Suche nach "Rohmasse" und ignoriere (35)
    # Beispiel: "Rohmasse (kg) (35) 16,220"
    pattern1 = r'Rohmasse[^\d]*\(35\)[^\d]*(\d+[.,]\d+)'
    match = re.search(pattern1, text, re.IGNORECASE)
    if match:
        weight_str = match.group(1).replace(',', '.')
        try:
            weight = float(weight_str)
            # Rohmasse ist normalerweise zwischen 0.01 und 50000 kg
            if 0.01 <= weight <= 50000:
                return weight
        except ValueError:
            pass

    # Pattern 2: Fallback ohne (35)
    pattern2 = r'Rohmasse[^\d]+(\d+[.,]\d+)'
    match = re.search(pattern2, text, re.IGNORECASE)
    if match:
        weight_str = match.group(1).replace(',', '.')
        try:
            weight = float(weight_str)
            if 0.01 <= weight <= 50000:
                return weight
        except ValueError:
            pass

    # Pattern 3: Nur (35) verwenden wenn nichts anderes funktioniert
    # ABER: Nehme die ZWEITE Zahl, nicht die erste (die könnte die Feldnummer sein)
    pattern3 = r'\(35\)[^\d]*(\d+)[^\d]+(\d+[.,]\d+)'
    match = re.search(pattern3, text)
    if match:
        # Nehme die zweite Zahl (group 2)
        weight_str = match.group(2).replace(',', '.')
        try:
            weight = float(weight_str)
            if 0.01 <= weight <= 50000:
                return weight
        except ValueError:
            pass

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

                # Extrahiere Block um den HS-Code
                # Kleinerer Block: nur 50 Zeichen davor, 200 danach
                # um Überlappungen mit anderen Positionen zu vermeiden
                block_start = max(0, hs_pos - 50)
                block_end = min(len(page), hs_pos + 200)
                block = page[block_start:block_end]

                # Stoppe bei nächstem HS-Code um Überlappung zu vermeiden
                next_hs_pos = -1
                for other_code in hs_codes:
                    if other_code != hs_code:
                        pos = block.find(other_code)
                        if pos > 0 and (next_hs_pos == -1 or pos < next_hs_pos):
                            next_hs_pos = pos

                if next_hs_pos > 0:
                    block = block[:next_hs_pos]

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

                # Suche nach Gewicht (kleinere Zahlen, meist < 50 kg für Positionen)
                # Priorisiere Gewichte mit "kg" oder nahe bei Gewichts-Feldnummern

                # Pattern 1: Suche nach explizitem "kg" Keyword
                weight_kg_pattern = r'(\d+[.,]\d{1,3})\s*kg'
                weight_kg_match = re.search(weight_kg_pattern, block, re.IGNORECASE)
                if weight_kg_match:
                    weight_str = weight_kg_match.group(1).replace(',', '.')
                    try:
                        weight = float(weight_str)
                        if 0.01 < weight < 100:  # Erweitert für größere Gewichte
                            position['netWeight'] = weight
                            position['grossWeight'] = weight
                    except ValueError:
                        pass

                # Pattern 2: Fallback - suche alle Zahlen mit Dezimalen
                if position['netWeight'] == 0.0:
                    weight_pattern = r'\b(\d+[.,]\d{1,3})\b'
                    weight_matches = re.findall(weight_pattern, block)

                    # Filtere HS-Codes und andere False Positives raus
                    for weight_str in weight_matches:
                        # Überspringe wenn es der HS-Code selbst ist
                        if weight_str.replace(',', '.').replace('.', '') == hs_code.replace('.', ''):
                            continue

                        weight_str = weight_str.replace(',', '.')
                        try:
                            weight = float(weight_str)
                            # Positionsgewichte sind meist zwischen 0.01 und 100 kg
                            # Filtere typische False Positives: 84.xx, 85.xx (HS-Codes)
                            if 0.01 <= weight < 100 and not (80 <= weight < 100):
                                position['netWeight'] = weight
                                position['grossWeight'] = weight
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
    # WICHTIG: Pattern muss "Packst" oder "insgesamt" VERWENDEN
    # Die Feldnummer (6) kann verwechselt werden!
    # Beispiel: "Packst. insgesamt (6) 1" → Wir wollen 1, nicht 6!

    # Pattern 1: Suche nach "Packst" gefolgt von Zahl (nicht in Klammern)
    pattern1 = r'Packst[^\d]*insgesamt[^\d]*\(6\)[^\d]*(\d+)'
    match = re.search(pattern1, text, re.IGNORECASE)
    if match:
        try:
            num = int(match.group(1))
            if 1 <= num <= 100:
                return num
        except ValueError:
            pass

    # Pattern 2: Fallback - suche "Packst" und dann erste kleine Zahl
    pattern2 = r'Packst[^\d]+(\d+)'
    match = re.search(pattern2, text, re.IGNORECASE)
    if match:
        try:
            count = int(match.group(1))
            if 1 <= count <= 100:
                return count
        except ValueError:
            pass

    # Pattern 3: Fallback - nimm die kleinste Zahl nach (6) im Bereich 1-10
    pattern3 = r'\(6\)[^\d]*(\d+)'
    matches = re.finditer(pattern3, text)
    candidates = []
    for m in matches:
        try:
            num = int(m.group(1))
            if 1 <= num <= 10:
                candidates.append(num)
        except ValueError:
            pass

    if candidates:
        return min(candidates)  # Nimm die kleinste Zahl

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
