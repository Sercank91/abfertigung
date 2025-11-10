"""
OCR Data Extractors
Extraktion von MRN, Adressen, HS-Codes, etc. aus OCR-Text
"""

import re
from typing import Dict, List, Optional, Tuple


def extract_mrn(text: str) -> Optional[str]:
    """
    Extrahiert MRN (Movement Reference Number) aus Text
    Format: 25NLBRHOG51LW45DA5 (2 Ziffern + Ländercode + 13 alphanumerisch)
    """
    # MRN Pattern: YYCCxxxxxxxxxxxxxxxxx (18 Zeichen total)
    mrn_pattern = r'\b(\d{2}[A-Z]{2}[A-Z0-9]{14})\b'
    match = re.search(mrn_pattern, text)
    return match.group(1) if match else None


def extract_procedure_codes(text: str) -> List[str]:
    """
    Extrahiert Procedure Codes (z.B. 1010, 1020, 3171, 3151)
    """
    # Suche nach 4-stelligen Codes die bekannte Procedures sind
    known_procedures = ['1010', '1020', '1040', '3171', '3151', '4000', '4071']
    found_codes = []

    for code in known_procedures:
        if code in text:
            found_codes.append(code)

    return found_codes


def classify_procedure_type(procedure_codes: List[str]) -> str:
    """
    Klassifiziert T1/T2/T- basierend auf Procedure Codes

    Regeln:
    - 1010, 1020, 1040 = T2 (EU-Waren)
    - 3171, 3151 = T1 (Nicht-EU-Waren)
    - Gemischt = T- (Mixed)
    """
    if not procedure_codes:
        return 'Unknown'

    t2_codes = {'1010', '1020', '1040'}
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


def extract_hs_codes(text: str) -> List[str]:
    """
    Extrahiert HS-Codes (Harmonized System Codes)
    Format: 8471.30, 3926.90.92, etc.
    """
    # HS-Code Pattern: 4-10 Ziffern, optional mit Punkten getrennt
    hs_pattern = r'\b(\d{4}(?:\.\d{2})?(?:\.\d{2})?)\b'
    matches = re.findall(hs_pattern, text)

    # Filter: Nur Codes zwischen 4-10 Ziffern (ohne Punkte gezählt)
    valid_hs_codes = []
    for match in matches:
        digits_only = match.replace('.', '')
        if 4 <= len(digits_only) <= 10:
            valid_hs_codes.append(match)

    return valid_hs_codes


def extract_weights(text: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Extrahiert Gewichte (Brutto und Netto) in kg

    Returns:
        (brutto_weight, netto_weight)
    """
    brutto = None
    netto = None

    # Brutto Pattern: "Brutto: 1234.56 kg" oder "Gross weight: 1234.56"
    brutto_patterns = [
        r'brutto[:\s]+(\d+(?:\.\d+)?)\s*kg',
        r'gross\s+weight[:\s]+(\d+(?:\.\d+)?)',
        r'bruttogewicht[:\s]+(\d+(?:\.\d+)?)'
    ]

    for pattern in brutto_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            brutto = float(match.group(1))
            break

    # Netto Pattern: "Netto: 1234.56 kg" oder "Net weight: 1234.56"
    netto_patterns = [
        r'netto[:\s]+(\d+(?:\.\d+)?)\s*kg',
        r'net\s+weight[:\s]+(\d+(?:\.\d+)?)',
        r'nettogewicht[:\s]+(\d+(?:\.\d+)?)'
    ]

    for pattern in netto_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            netto = float(match.group(1))
            break

    return (brutto, netto)


def extract_packages(text: str) -> Optional[int]:
    """
    Extrahiert Anzahl der Packstücke
    """
    # Pattern: "Packages: 25" oder "Anzahl Packstücke: 25" oder "Colli: 25"
    package_patterns = [
        r'packages[:\s]+(\d+)',
        r'packst[üu]cke[:\s]+(\d+)',
        r'colli[:\s]+(\d+)',
        r'anzahl[:\s]+(\d+)'
    ]

    for pattern in package_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))

    return None


def extract_value_and_currency(text: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Extrahiert Warenwert und Währung

    Returns:
        (value, currency)
    """
    # Pattern: "Value: 12345.67 EUR" oder "Wert: 12345.67 USD"
    value_patterns = [
        r'value[:\s]+(\d+(?:\.\d+)?)\s*([A-Z]{3})',
        r'wert[:\s]+(\d+(?:\.\d+)?)\s*([A-Z]{3})',
        r'invoice\s+value[:\s]+(\d+(?:\.\d+)?)\s*([A-Z]{3})'
    ]

    for pattern in value_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return (float(match.group(1)), match.group(2).upper())

    return (None, None)


def extract_invoice_numbers(text: str) -> List[str]:
    """
    Extrahiert Rechnungsnummern
    """
    # Pattern: "Invoice: INV-12345" oder "Rechnung: R-2024-001"
    invoice_patterns = [
        r'invoice[:\s#]+([A-Z0-9\-]+)',
        r'rechnung[:\s#]+([A-Z0-9\-]+)',
        r'inv[:\s#]+([A-Z0-9\-]+)'
    ]

    invoices = []
    for pattern in invoice_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        invoices.extend(matches)

    # Deduplizieren
    return list(set(invoices))


def extract_address(text: str, marker: str = None) -> Optional[Dict[str, str]]:
    """
    Extrahiert eine Adresse aus Text

    Args:
        text: OCR-Text
        marker: Optional marker wie "Sender:", "Empfänger:", "Consignee:"

    Returns:
        Dict mit {name, address, zip, city, country}
    """
    if marker:
        # Suche Text nach dem Marker
        marker_pos = text.lower().find(marker.lower())
        if marker_pos == -1:
            return None

        # Nimm die nächsten 5 Zeilen nach dem Marker
        text_after_marker = text[marker_pos:marker_pos + 500]
        lines = text_after_marker.split('\n')[:6]  # Max 6 Zeilen
    else:
        lines = text.split('\n')

    # Versuche Adress-Komponenten zu extrahieren
    name = None
    address = None
    zip_code = None
    city = None
    country = None

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Erste nicht-leere Zeile = Name (wenn kein Marker in der Zeile)
        if name is None and marker and marker.lower() not in line.lower():
            name = line
            continue

        # PLZ + Stadt Pattern: "12345 Berlin" oder "D-12345 Berlin"
        zip_city_match = re.search(r'([A-Z]{0,2}-?\d{4,6})\s+([A-Za-zäöüÄÖÜß\s]+)', line)
        if zip_city_match and not zip_code:
            zip_code = zip_city_match.group(1)
            city = zip_city_match.group(2).strip()
            continue

        # Ländercode am Ende: "DE", "TR", "NL"
        country_match = re.search(r'\b([A-Z]{2})\b\s*$', line)
        if country_match:
            country = country_match.group(1)
            continue

        # Sonst ist es Teil der Adresse
        if address is None:
            address = line

    # Wenn wir genug Daten haben, return
    if name or address or city:
        return {
            'name': name,
            'address': address,
            'zip': zip_code,
            'city': city,
            'country': country
        }

    return None


def detect_document_type(text: str) -> str:
    """
    Erkennt Dokumententyp (EX1, T1, N821, Invoice)
    """
    text_lower = text.lower()

    if 'ex1' in text_lower or 'ausfuhranmeldung' in text_lower:
        return 'EX1'
    elif 'n821' in text_lower or 't1' in text_lower:
        return 'T1'
    elif 'invoice' in text_lower or 'rechnung' in text_lower:
        return 'Invoice'
    else:
        return 'Unknown'


def parse_positions_table(text: str) -> List[Dict]:
    """
    Versucht eine Positions-Tabelle zu parsen

    Returns:
        Liste von Dicts mit {orderNumber, hsCode, description, netWeight, ...}
    """
    positions = []

    # Suche nach tabellenartigen Strukturen
    # Dies ist eine vereinfachte Version - in der Praxis braucht man ML-basierte Table Detection

    lines = text.split('\n')

    for i, line in enumerate(lines):
        # Suche nach Zeilen mit HS-Code Pattern
        hs_match = re.search(r'\b(\d{4}(?:\.\d{2})?(?:\.\d{2})?)\b', line)
        if hs_match:
            hs_code = hs_match.group(1)

            # Extrahiere weitere Daten aus der Zeile
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

            # Suche nach Gewicht in der Zeile
            weight_match = re.search(r'(\d+(?:\.\d+)?)\s*kg', line)
            if weight_match:
                position_data['netWeight'] = float(weight_match.group(1))

            # Suche nach Procedure Code
            procedure_codes = extract_procedure_codes(line)
            if procedure_codes:
                position_data['procedure'] = procedure_codes[0]

            # Beschreibung: Text zwischen HS-Code und Gewicht
            desc_parts = re.split(r'\d+(?:\.\d+)?\s*kg', line)
            if len(desc_parts) > 0:
                desc = desc_parts[0].replace(hs_code, '').strip()
                position_data['description'] = desc[:100]  # Max 100 Zeichen

            positions.append(position_data)

    # Bruttogewicht nur bei erster Position
    if positions and len(positions) > 0:
        total_net = sum(p['netWeight'] for p in positions)
        if total_net > 0:
            positions[0]['grossWeight'] = total_net * 1.1  # Schätzung: 10% mehr

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
            # Konvertiere Dict zu String für Vergleich
            sender_str = f"{sender.get('name')}|{sender.get('address')}|{sender.get('city')}"
            senders.add(sender_str)

        if receiver:
            receiver_str = f"{receiver.get('name')}|{receiver.get('address')}|{receiver.get('city')}"
            receivers.add(receiver_str)

    # Wenn nur 1 einzigartiger Sender/Empfänger → common
    common_sender = None
    common_receiver = None

    if len(senders) == 1:
        # Alle haben den gleichen Sender
        common_sender = positions[0].get('sender')
        # Entferne Sender aus Positionen
        for pos in positions:
            pos['sender'] = None

    if len(receivers) == 1:
        # Alle haben den gleichen Empfänger
        common_receiver = positions[0].get('receiver')
        # Entferne Empfänger aus Positionen
        for pos in positions:
            pos['receiver'] = None

    return (common_sender, common_receiver, positions)
