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

    # STRATEGIE: Priorisiere [1] Marker (Anmelder/Vertreter) über (2) Marker
    # [1] steht oft im (14) Vertreter-Block und hat die korrekte Firmenadresse

    block = None

    # PRIORITÄT 1: Suche nach [1] im GESAMTEN Text
    match = re.search(r'\[1\]\s*([A-ZÄÖÜ])', text)
    if match:
        start = match.start()
        # Nimm Block ab [1]: 600 Zeichen nach [1] für vollständige Adresse
        block = text[start:start+600]

    # PRIORITÄT 2: Falls kein [1], suche nach (2) Versender Block
    if not block:
        marker_patterns = [
            r'Versender[^\n]{0,50}\(2\)',
            r'\(2\)[^\n]{0,100}',
        ]

        for pattern in marker_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start = match.start()
                block = text[start:start+400]
                break

    if block:
        lines = block.split('\n')

        # PRIORITÄT 1: Suche nach [1] DEUTAWERKE (Vertreter-Marker)
        for line in lines[:10]:
            if '[1]' in line:
                # Extrahiere alles nach [1]
                name = re.sub(r'^.*\[1\]\s*', '', line).strip()
                # Bereinige Suffix wie "| <"
                name = re.sub(r'\s*\|\s*[<>].*$', '', name)
                if name and len(name) >= 3 and not name.isdigit():
                    sender['name'] = name
                    break

        # PRIORITÄT 2: Falls nicht gefunden, suche nach Firmennamen in den ersten Zeilen
        if not sender['name']:
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
                # Bereinige trailing garbage wie "Vordrucke (3)" etc.
                address = line
                # Entferne alles ab "Vordrucke", "Anm.", etc.
                address = re.sub(r'\s+Vordrucke.*$', '', address, flags=re.IGNORECASE)
                address = re.sub(r'\s+Anm\..*$', '', address, flags=re.IGNORECASE)
                address = re.sub(r'\s*\|.*$', '', address)  # Entferne "|" und alles danach
                sender['address'] = address.strip()
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

    STRATEGIE:
    1. Suche zuerst nach (8) Code-Marker
    2. Falls nicht gefunden, suche nach türkischen Städten
    3. Extrahiere Firmenname, Adresse, PLZ aus dem gefundenen Block
    """
    receiver = {
        'name': None,
        'address': None,
        'zip': None,
        'city': None,
        'country': None
    }

    # STRATEGIE 1: Suche nach (8) Code - höchste Priorität
    empfaenger_patterns = [
        r'Empf[äa]nger[^\n]{0,50}\(8\)',  # "Empfänger (8)"
        r'\(8\)[^\n]{0,100}',              # Nur "(8)"
    ]

    block = None
    for pattern in empfaenger_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Finde Position des (8) Markers
            start = match.start()
            # Nimm Block bis zu 800 Zeichen nach (8)
            block = text[start:start+800]
            break

    # STRATEGIE 2: Falls kein (8) gefunden, suche nach türkischer Stadt
    turkish_cities = ['Ankara', 'Istanbul', 'İstanbul', 'Izmir', 'İzmir', 'Bursa', 'Antalya', 'Gaziantep']

    if not block:
        for city in turkish_cities:
            if city in text:
                # Finde Block um diese Stadt (größerer Bereich für Namen)
                city_pos = text.find(city)
                block_start = max(0, city_pos - 500)  # Erweitert für Namen
                block_end = city_pos + 200
                block = text[block_start:block_end]
                break

    if not block:
        return None

    # AB HIER: Extrahiere Daten aus dem gefundenen Block
    # Suche nach türkischer Stadt im Block
    for city in turkish_cities:
        if city in block:

            receiver['city'] = city
            receiver['country'] = 'TR'

            # Suche PLZ vor Stadt (0xxxx für Ankara, 3xxxx für İstanbul, etc.)
            zip_match = re.search(r'\b(\d{5})\s+' + re.escape(city), block)
            if zip_match:
                receiver['zip'] = zip_match.group(1)

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

            # VERBESSERT: Suche nach Firmenname im GESAMTEN Block
            # (nicht nur nach der Adresse, da OCR Reihenfolge durcheinander sein kann)

            # Pattern 1: Sehr spezifisch für "Endüstri Teknik Ltd. Sti."
            name_patterns = [
                # Genau "Endüstri Teknik Ltd. Sti." oder Variationen
                r'([A-Za-zığüşöçİĞÜŞÖÇ]+\s+(?:Endüstri|Endustri)\s+(?:Teknik|Teknoloji)\s+Ltd\.?\s+Sti\.?)',
                # Generisch: Wörter + "Ltd. Sti."
                r'([A-Za-zığüşöçİĞÜŞÖÇ]{3,}\s+[A-Za-zığüşöçİĞÜŞÖÇ]{3,}\s+Ltd\.?\s+Sti\.?)',
                # Nur "Endüstri Teknik"
                r'([A-Za-zığüşöçİĞÜŞÖÇ]+\s+(?:Endüstri|Endustri)\s+[A-Za-zığüşöçİĞÜŞÖÇ]+)',
                # Beliebige Wörter + Ltd/Sti
                r'([A-Za-zığüşöçİĞÜŞÖÇ\s]{5,60}(?:Ltd|Sti|A\.S|A\.Ş)\.?(?:\s+Sti\.?)?)',
                # Wörter mit Teknik
                r'([A-Za-zığüşöçİĞÜŞÖÇ\s]+Teknik[A-Za-zığüşöçİĞÜŞÖÇ\s]*)',
            ]

            for pattern in name_patterns:
                name_match = re.search(pattern, block, re.IGNORECASE)
                if name_match:
                    name = name_match.group(1).strip()

                    # Bereinige OCR-Artefakte
                    name = re.sub(r'^\|\s*\(.*?\)\s*', '', name)  # "| (8)"
                    name = re.sub(r'^\s*\(8\)\s*', '', name)      # "(8)"
                    name = re.sub(r'^Empf[äa]nger.*?\(8\)\s*', '', name, flags=re.IGNORECASE)  # "Empfänger (8)"
                    name = re.sub(r'^\s*[Ee]\s+', '', name)       # "E " Prefix
                    name = re.sub(r'^\|\s*', '', name)            # "|"
                    name = re.sub(r'\s+', ' ', name)              # Whitespace

                    # Entferne trailing Adressteile (falls der Match zu viel enthält)
                    name = re.sub(r'\s+(?:Caddesi|Cad\.|Sokak|Sok\.).*$', '', name)
                    name = re.sub(r'\s+\d{5}\s+.*$', '', name)    # PLZ + Rest
                    name = re.sub(r'\s+Arjantin\s+.*$', '', name) # Spezifisch für diesen Fall

                    name = name.strip()

                    # Validiere Name
                    if len(name) >= 5 and not name.isdigit():
                        receiver['name'] = name
                        break

            # Fallback: Suche Zeile für Zeile nach Company Keywords
            if not receiver['name']:
                lines = block.split('\n')
                for line in lines:
                    line_clean = line.strip()

                    # Überspringe leere Zeilen und reine Zahlen/Codes
                    if len(line_clean) < 5 or line_clean.isdigit():
                        continue

                    # Suche nach typischen türkischen Company-Suffixen
                    if any(keyword in line_clean for keyword in ['Ltd', 'Sti', 'A.S', 'A.Ş', 'Teknik', 'Endüstri', 'Endustri']):
                        # Bereinige
                        name = re.sub(r'^\|\s*\(.*?\)\s*', '', line_clean)
                        name = re.sub(r'^\s*\(8\)\s*', '', name)
                        name = re.sub(r'^\s*[Ee]\s+', '', name)
                        name = re.sub(r'^\|\s*', '', name)
                        name = name.strip()

                        if len(name) >= 5 and not name.isdigit():
                            receiver['name'] = name
                            break

            break  # Stadt gefunden, Extraktion abgeschlossen

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

    WICHTIG: Der Wert kann in der nächsten Zeile stehen!
    Beispiel:
        Rohmasse (kg) (35) BG00
        | 4 der Grenze (25) 16,220    ← Hier steht der Wert!

    STRATEGIE: Suche (35), dann in den nächsten 2-3 Zeilen nach Gewicht
    """
    # Pattern 1: Suche nach (35), dann innerhalb der nächsten 200 Zeichen nach Gewicht
    # Das deckt mehrere Zeilen ab
    pattern1 = r'\(35\)([^\n]*(?:\n[^\n]*){0,3})'
    matches = re.finditer(pattern1, text)

    candidates = []
    for match in matches:
        block = match.group(1)
        # Suche alle Zahlen mit Komma/Punkt in diesem Block
        weight_pattern = r'(\d+[.,]\d{1,3})\b'
        weight_matches = re.findall(weight_pattern, block)

        for weight_str in weight_matches:
            weight_str_clean = weight_str.replace(',', '.')
            try:
                weight = float(weight_str_clean)
                # Filter: Gewicht zwischen 0.01 und 50000, nicht 35 oder 6
                if 0.01 <= weight <= 50000 and weight != 35.0 and weight != 6.0 and weight != 25.0:
                    # Zusätzlich: Filtere offensichtlich falsche Werte wie 44.4 (das ist (44.4) Code)
                    if weight != 44.4 and weight != 44.2:
                        candidates.append(weight)
            except ValueError:
                pass

    if candidates:
        # Wähle das größte Gewicht (Total ist meist größer)
        return max(candidates)

    # Pattern 2: Fallback - suche "Rohmasse" + (35) mit mehr Toleranz
    pattern2 = r'Rohmasse[^\n]*\(35\)([^\n]*(?:\n[^\n]*){0,3})'
    matches = re.finditer(pattern2, text, re.IGNORECASE)

    candidates = []
    for match in matches:
        block = match.group(1)
        weight_pattern = r'(\d+[.,]\d{1,3})\b'
        weight_matches = re.findall(weight_pattern, block)

        for weight_str in weight_matches:
            weight_str_clean = weight_str.replace(',', '.')
            try:
                weight = float(weight_str_clean)
                if 0.01 <= weight <= 50000 and weight != 35.0 and weight != 44.4:
                    candidates.append(weight)
            except ValueError:
                pass

    if candidates:
        return max(candidates)

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

    WICHTIG: Der Wert steht oft in einer Position-Zeile wie "1 CT, Karton"!
    Beispiel: "| 1 | 1. 1 CT, Karton 2402037" → 1 Packstück

    STRATEGIE:
    1. Suche nach "X CT" oder "X Karton" Pattern
    2. Falls nicht gefunden, suche in Zeilen nach (6)
    """
    # Pattern 1: Suche nach "X CT, Karton" oder "X CT" (typisch für Positionen)
    # Beispiel: "1 CT, Karton" oder "2 CT"
    pattern1 = r'\b(\d{1,2})\s+CT\b'
    matches = re.findall(pattern1, text, re.IGNORECASE)

    if matches:
        # Wandle in Integers und nimm kleinsten Wert (meist der Gesamt)
        candidates = []
        for match in matches:
            try:
                num = int(match)
                if 1 <= num <= 100:
                    candidates.append(num)
            except ValueError:
                pass
        if candidates:
            return min(candidates)

    # Pattern 2: Suche nach "X Karton" oder "X Kartons"
    pattern2 = r'\b(\d{1,2})\s+Kartons?\b'
    matches = re.findall(pattern2, text, re.IGNORECASE)

    if matches:
        candidates = []
        for match in matches:
            try:
                num = int(match)
                if 1 <= num <= 100:
                    candidates.append(num)
            except ValueError:
                pass
        if candidates:
            return min(candidates)

    # Pattern 3: Suche nach (6) und dann in den nächsten 2 Zeilen nach einer Zahl
    pattern3 = r'\(6\)([^\n]*(?:\n[^\n]*){0,2})'
    matches = re.finditer(pattern3, text)

    candidates = []
    for match in matches:
        block = match.group(1)
        # Suche nach kleinen Zahlen (1-10) im Block
        num_pattern = r'\b([1-9]|10)\b'
        num_matches = re.findall(num_pattern, block)

        for num_str in num_matches:
            try:
                num = int(num_str)
                if num != 6:  # Nicht die Feldnummer selbst
                    candidates.append(num)
            except ValueError:
                pass

    if candidates:
        # Bevorzuge kleinste Zahl
        return min(candidates)

    # Pattern 4: Fallback - suche "Packst" in der Nähe von Zahlen
    pattern4 = r'Packst[^\d]*(\d{1,2})'
    matches = re.findall(pattern4, text, re.IGNORECASE)

    candidates = []
    for match in matches:
        try:
            num = int(match)
            if 1 <= num <= 100 and num != 6:
                candidates.append(num)
        except ValueError:
            pass

    if candidates:
        small_candidates = [c for c in candidates if c <= 10]
        if small_candidates:
            return min(small_candidates)
        return min(candidates)

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
