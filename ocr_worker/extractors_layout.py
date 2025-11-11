"""
Layout-basierte Daten-Extraktion
=================================

Nutzt die visuellen Blöcke vom LayoutAnalyzer um Daten zu extrahieren.

Architektur:
- Seite 1: Kopfdaten (MRN, Versender, Empfänger, Gesamt-Gewichte)
- Seite 2+: Positionen (jede Position = eigener Block)

Vorteil gegenüber Text-basiert:
- Nutzt visuelle Struktur (Blöcke, Linien)
- Weniger Verwechslungen zwischen Feldern
- Robuster gegen Layout-Variationen
"""

import re
from typing import List, Dict, Optional
from layout_analyzer import LayoutAnalyzer, LayoutBlock, TextWord


class LayoutBasedExtractor:
    """Extrahiert Daten aus EU-Zolldokumenten basierend auf Layout-Blöcken"""

    def __init__(self, debug: bool = False):
        self.debug = debug

    def extract_from_block(self, block: LayoutBlock, field_code: str,
                          value_type: str = 'text') -> Optional[str]:
        """
        Extrahiert einen Wert aus einem Block nach einem Feld-Code

        Args:
            block: Der Block aus dem extrahiert werden soll
            field_code: Der Feld-Code z.B. '(32)', '(33)'
            value_type: Art des Wertes ('text', 'number', 'weight', 'hs_code')

        Returns:
            Extrahierter Wert oder None
        """
        # Prüfe ob der Block den Feld-Code enthält
        if field_code not in block.field_codes:
            return None

        # Hole kompletten Text des Blocks
        text = block.get_text()

        # Finde Position des Feld-Codes
        code_match = re.search(re.escape(field_code), text)
        if not code_match:
            return None

        # Text nach dem Code
        snippet = text[code_match.end():code_match.end() + 500]

        # Extrahiere basierend auf Typ
        if value_type == 'number':
            # Einfache Zahl (1, 2, 3...)
            match = re.search(r'\b(\d{1,3})\b', snippet)
            return match.group(1) if match else None

        elif value_type == 'weight':
            # Gewicht mit Komma/Punkt
            match = re.search(r'(\d+[.,]\d+)', snippet)
            return match.group(1).replace(',', '.') if match else None

        elif value_type == 'hs_code':
            # 8-stelliger HS-Code
            match = re.search(r'\b(\d{8})\b', snippet)
            return match.group(1) if match else None

        elif value_type == 'procedure':
            # Verfahrenscode: oft "XX XX" format
            match = re.search(r'\b(\d{2})\s+(\d{2})', snippet)
            if match:
                return match.group(1) + match.group(2)
            # Fallback: 4-stellig
            match = re.search(r'\b(\d{4})\b', snippet)
            return match.group(1) if match else None

        elif value_type == 'text':
            # Text-Extraktion (nach dem Code)
            match = re.search(r'[^\w\s]{0,20}([A-Za-zÀ-ÿéèêëàâôûçÉÈÊËÀÂÔÛÇ][\w\sÀ-ÿéèêëàâôûçÉÈÊËÀÂÔÛÇ\-]{5,100})', snippet)
            if match:
                result = match.group(1).strip()
                # Bereinige
                result = re.sub(r'\s*\d{8}\s*$', '', result)
                return result
            return None

        elif value_type == 'mrn':
            # MRN: 18-stellig (z.B. 24FRD5340043964970)
            match = re.search(r'\b(\d{2}[A-Z]{2}[A-Z0-9]{14})\b', snippet)
            return match.group(1) if match else None

        return None

    def extract_header_from_page(self, blocks: List[LayoutBlock], all_words: List = None) -> Dict:
        """
        Extrahiert Kopfdaten von Seite 1

        Args:
            blocks: Liste der Blöcke von Seite 1
            all_words: Optional - alle Wörter von Seite 1 für MRN-Suche

        Returns:
            Dict mit: mrn, sender, receiver, totalGrossWeight, totalPackages
        """
        if self.debug:
            print(f"\n{'='*80}")
            print(f"📄 KOPFDATEN-EXTRAKTION (Seite 1)")
            print(f"{'='*80}")

        header = {
            'mrn': None,
            'sender': None,
            'receiver': None,
            'totalGrossWeight': 0.0,
            'totalPackages': 0,
            'exportCountry': None,
            'destinationCountry': None
        }

        # MRN: Suche in ALLEN Blöcken UND einzelnen Wörtern
        # MRN ist oft rechts oben, kann außerhalb großer Blöcke sein
        # Pattern: 18 Zeichen wie "24FRD5340043964970"

        # Strategie 1: Durchsuche ALLE Wörter (auch außerhalb von Blöcken)
        if all_words:
            for word in all_words:
                if len(word.text) >= 18:
                    # MRN Pattern: 2 Ziffern + 2 Buchstaben + 14 Zeichen
                    if re.match(r'^\d{2}[A-Z]{2}[A-Z0-9]{14,16}$', word.text):
                        header['mrn'] = word.text[:18]  # Nimm erste 18 Zeichen
                        if self.debug:
                            print(f"✓ MRN gefunden: {header['mrn']}")
                        break

        # Strategie 2: Durchsuche Wörter in Blöcken
        if not header['mrn']:
            for block in blocks:
                for word in block.words:
                    if len(word.text) >= 18:
                        # MRN Pattern: 2 Ziffern + 2 Buchstaben + 14 Zeichen
                        if re.match(r'^\d{2}[A-Z]{2}[A-Z0-9]{14,16}$', word.text):
                            header['mrn'] = word.text[:18]  # Nimm erste 18 Zeichen
                            if self.debug:
                                print(f"✓ MRN gefunden (in Block): {header['mrn']}")
                            break
                if header['mrn']:
                    break

        # Strategie 3: Suche im kombinierten Text
        if not header['mrn']:
            all_text = ' '.join([block.get_text() for block in blocks])
            mrn_match = re.search(r'\b(\d{2}[A-Z]{2}[A-Z0-9]{14,16})\b', all_text)
            if mrn_match:
                header['mrn'] = mrn_match.group(1)[:18]
                if self.debug:
                    print(f"✓ MRN gefunden (kombiniert): {header['mrn']}")

        # VERSENDER (2) - VOLLSTÄNDIGE Adresse
        sender_blocks = [b for b in blocks if '(2)' in b.field_codes]
        if sender_blocks:
            sender_block = sender_blocks[0]
            sender_words = sender_block.words

            # Finde Start: Nach "No XXXXXXX"
            sender_parts = []
            skip_next = False
            for i, word in enumerate(sender_words):
                if skip_next:
                    skip_next = False
                    continue

                if word.text == 'No':
                    # Überspringe "No" und die nächste Nummer (z.B. "DE2769727")
                    skip_next = True
                    continue

                # Wenn wir nach "No" sind, sammle Wörter
                if i > 0 and sender_words[i-1].text == 'No':
                    # Das ist die Nummer nach "No", überspringe
                    continue

                # Ab hier sammeln (aber nur nach "No")
                if any(w.text == 'No' for w in sender_words[:i]):
                    # Stoppe bei nächstem Feld-Code
                    if '(' in word.text and ')' in word.text:
                        break
                    sender_parts.append(word.text)

            if sender_parts:
                header['sender'] = ' '.join(sender_parts[:30])  # Max 30 Wörter
                if self.debug:
                    print(f"✓ Versender: {header['sender'][:80]}...")

        # EMPFÄNGER (8) - VOLLSTÄNDIGE Adresse
        receiver_blocks = [b for b in blocks if '(8)' in b.field_codes]
        if receiver_blocks:
            receiver_block = receiver_blocks[0]
            receiver_words = receiver_block.words

            # Strategie: Sammle ALLE Wörter nach (8), überspringe nur "No" und die ID-Nummer
            receiver_parts = []
            found_field_8 = False
            skip_count = 0

            for i, word in enumerate(receiver_words):
                # Finde (8) Feld
                if '(8)' in word.text:
                    found_field_8 = True
                    continue

                if found_field_8:
                    # Überspringe "No" und die nächste Nummer (nur einmal am Anfang)
                    if word.text == 'No' and skip_count == 0:
                        skip_count = 1
                        continue
                    if skip_count == 1:
                        # Das ist die ID-Nummer nach "No", überspringe
                        skip_count = 2
                        continue

                    # Ab jetzt alle Wörter sammeln bis zum nächsten Feld-Code
                    if '(' in word.text and ')' in word.text:
                        break

                    receiver_parts.append(word.text)

            if receiver_parts:
                header['receiver'] = ' '.join(receiver_parts[:30])  # Max 30 Wörter
                if self.debug:
                    print(f"✓ Empfänger: {header['receiver'][:80]}...")

        # ROHMASSE (35)
        weight_blocks = [b for b in blocks if '(35)' in b.field_codes]
        if weight_blocks:
            weight_str = self.extract_from_block(weight_blocks[0], '(35)', 'weight')
            if weight_str:
                try:
                    header['totalGrossWeight'] = float(weight_str)
                    if self.debug:
                        print(f"✓ Rohmasse: {header['totalGrossWeight']} kg")
                except:
                    pass

        # PACKSTÜCKE (6)
        package_blocks = [b for b in blocks if '(6)' in b.field_codes]
        if package_blocks:
            packages_str = self.extract_from_block(package_blocks[0], '(6)', 'number')
            if packages_str:
                try:
                    header['totalPackages'] = int(packages_str)
                    if self.debug:
                        print(f"✓ Packstücke: {header['totalPackages']}")
                except:
                    pass

        if self.debug:
            print(f"{'='*80}\n")

        return header

    def extract_position_from_block(self, block: LayoutBlock, index: int) -> Dict:
        """
        Extrahiert eine Position aus einem Block mit (32)

        Args:
            block: Block der die Position enthält
            index: Index für Fallback-Positionsnummer

        Returns:
            Dict mit Position-Daten
        """
        if self.debug:
            print(f"\n📦 POSITION {index + 1}")
            print(f"{'='*80}")

        position = {
            'orderNumber': index + 1,
            'description': None,
            'hsCode': None,
            'grossWeight': 0.0,
            'netWeight': 0.0,
            'procedure': None,
            'procedureType': None,
            'itemPrice': 0.0,
            'value': None,
            'currency': None
        }

        # 1. POSITIONSNUMMER aus (32)
        # Die Positionsnummer steht oft am Anfang einer Zeile nach (32)
        # Patterns: "1 CT", "2 CT", "| 1 CT", etc.

        # Finde (32) in den Wörtern
        code_32_found = False
        pos_number = None
        candidates = []  # Sammle alle Kandidaten

        for i, word in enumerate(block.words):
            if '(32)' in word.text:
                code_32_found = True
                # Suche die nächsten 30 Wörter nach einer einzelnen Zahl (1-99)
                # Die Positionsnummer steht normalerweise VOR "CT" oder "COLIS"
                for j in range(i+1, min(i+30, len(block.words))):
                    next_word = block.words[j].text
                    # Ist es eine einzelne Zahl 1-99?
                    if re.match(r'^(\d{1,2})$', next_word):
                        try:
                            num = int(next_word)
                            # Plausible Positionsnummer (1-99)
                            # Ignoriere offensichtlich falsche Zahlen wie 31, 32, 33, 35, 37, 38 (Feld-Nummern)
                            if 1 <= num <= 99 and num not in [31, 32, 33, 35, 37, 38, 44, 46]:
                                # Prüfe ob direkt danach "CT" oder "COLIS" kommt (beste Kandidaten!)
                                if j+1 < len(block.words) and block.words[j+1].text.upper() in ['CT', 'COLIS']:
                                    candidates.append((num, 100))  # Hohe Priorität
                                else:
                                    candidates.append((num, j-i))  # Priorität = Abstand von (32)
                        except:
                            pass
                break

        # Wähle besten Kandidaten (höchste Priorität = kleinster Wert)
        if candidates:
            # Sortiere: Erst nach Priorität (absteigend), dann nach Nummer (aufsteigend)
            candidates.sort(key=lambda x: (-x[1], x[0]))
            pos_number = candidates[0][0]

        if pos_number:
            position['orderNumber'] = pos_number
            if self.debug:
                print(f"✓ (32) Positionsnummer: {position['orderNumber']}")
        else:
            if self.debug:
                print(f"⚠️  (32) Positionsnummer nicht gefunden, verwende {index + 1}")

        # 2. BESCHREIBUNG aus (31/2)
        desc = self.extract_from_block(block, '(31/2)', 'text')
        if desc:
            position['description'] = desc
            if self.debug:
                print(f"✓ (31/2) Beschreibung: {desc[:60]}...")
        else:
            if self.debug:
                print(f"✗ (31/2) Beschreibung nicht gefunden")

        # 3. HS-CODE aus (33)
        hs_code = self.extract_from_block(block, '(33)', 'hs_code')
        if hs_code:
            position['hsCode'] = hs_code
            if self.debug:
                print(f"✓ (33) HS-Code: {hs_code}")
        else:
            if self.debug:
                print(f"✗ (33) HS-Code nicht gefunden")

        # 4. BRUTTOGEWICHT aus (35)
        gross = self.extract_from_block(block, '(35)', 'weight')
        if gross:
            try:
                position['grossWeight'] = float(gross)
                if self.debug:
                    print(f"✓ (35) Bruttogewicht: {position['grossWeight']} kg")
            except:
                if self.debug:
                    print(f"✗ (35) Bruttogewicht ungültig: {gross}")

        # 5. NETTOGEWICHT aus (38)
        net = self.extract_from_block(block, '(38)', 'weight')
        if net:
            try:
                position['netWeight'] = float(net)
                if self.debug:
                    print(f"✓ (38) Nettogewicht: {position['netWeight']} kg")
            except:
                if self.debug:
                    print(f"✗ (38) Nettogewicht ungültig: {net}")

        # VALIDIERUNG: Tausche Gewichte falls Netto > Brutto
        if position['netWeight'] > 0 and position['grossWeight'] > 0:
            if position['netWeight'] > position['grossWeight']:
                if self.debug:
                    print(f"⚠️  Gewichte vertauscht! Tausche: Netto {position['netWeight']} <-> Brutto {position['grossWeight']}")
                position['netWeight'], position['grossWeight'] = position['grossWeight'], position['netWeight']

        # 6. VERFAHREN aus (37)
        proc = self.extract_from_block(block, '(37)', 'procedure')
        if proc and proc.startswith(('1', '31', '32', '40', '42', '51')):
            # Expandiere zu 4-stellig
            if len(proc) == 2:
                proc = proc + '00'
            elif len(proc) == 3:
                proc = proc + '0'

            position['procedure'] = proc

            # Klassifiziere
            if proc in ['1000', '1010', '1020', '1040']:
                position['procedureType'] = 'Ausfuhr'
            elif proc in ['3171', '3151']:
                position['procedureType'] = 'Versand'
            elif proc in ['4000', '4071']:
                position['procedureType'] = 'Veredelung'

            if self.debug:
                print(f"✓ (37) Verfahren: {proc} ({position['procedureType'] or 'Unknown'})")
        else:
            if self.debug:
                if proc:
                    print(f"✗ (37) Verfahren ungültig: {proc}")
                else:
                    print(f"✗ (37) Verfahren nicht gefunden")

        if self.debug:
            print(f"{'='*80}\n")

        return position

    def extract_positions_from_pages(self, pages_blocks: List[List[LayoutBlock]]) -> List[Dict]:
        """
        Extrahiert alle Positionen von Seite 2+

        Args:
            pages_blocks: Liste von Block-Listen (eine pro Seite)

        Returns:
            Liste von Position-Dicts
        """
        if self.debug:
            print(f"\n{'='*80}")
            print(f"📦 POSITIONS-EXTRAKTION (Seite 2+)")
            print(f"{'='*80}")

        all_positions = []

        # Durchlaufe alle Seiten ab Seite 2 (Index 1)
        for page_num, blocks in enumerate(pages_blocks[1:], start=2):
            # Finde Blöcke mit (32) Code
            position_blocks = [b for b in blocks if '(32)' in b.field_codes]

            if self.debug:
                print(f"\nSeite {page_num}: {len(position_blocks)} Position-Blöcke gefunden")

            for i, block in enumerate(position_blocks):
                position = self.extract_position_from_block(block, len(all_positions))
                all_positions.append(position)

        # Sortiere nach orderNumber
        all_positions.sort(key=lambda p: p['orderNumber'])

        if self.debug:
            print(f"\n{'='*80}")
            print(f"✅ {len(all_positions)} Positionen extrahiert")
            print(f"{'='*80}\n")

        return all_positions


def test_layout_extractor(pdf_path: str):
    """Test-Funktion für Layout-Extraktor"""
    import os
    from pdf2image import convert_from_path

    print(f"{'='*80}")
    print(f"🧪 TEST: LAYOUT-BASIERTE EXTRAKTION")
    print(f"Datei: {os.path.basename(pdf_path)}")
    print(f"{'='*80}")

    # PDF zu Bildern
    images = convert_from_path(pdf_path, dpi=300)

    # Layout-Analyzer
    analyzer = LayoutAnalyzer(
        tesseract_cmd=r'C:\Program Files\Tesseract-OCR\tesseract.exe' if os.name == 'nt' else None,
        languages='deu+fra+eng'
    )
    analyzer.debug = False  # Weniger Output für Test

    # Analysiere alle Seiten
    all_pages_blocks = []
    all_pages_words = []
    for page_num, image in enumerate(images):
        blocks, words = analyzer.analyze_image(image, page_num)
        all_pages_blocks.append(blocks)
        all_pages_words.append(words)

    # Extraktor
    extractor = LayoutBasedExtractor(debug=True)

    # 1. Extrahiere Kopfdaten von Seite 1 (mit words für MRN-Suche)
    if len(all_pages_blocks) > 0:
        header = extractor.extract_header_from_page(all_pages_blocks[0], all_words=all_pages_words[0] if all_pages_words else [])

        print(f"\n{'='*80}")
        print(f"📋 KOPFDATEN")
        print(f"{'='*80}")
        print(f"MRN: {header['mrn']}")
        print(f"Versender: {header['sender']}")
        print(f"Empfänger: {header['receiver']}")
        print(f"Rohmasse: {header['totalGrossWeight']} kg")
        print(f"Packstücke: {header['totalPackages']}")
        print(f"{'='*80}\n")

    # 2. Extrahiere Positionen von Seite 2+
    positions = extractor.extract_positions_from_pages(all_pages_blocks)

    print(f"\n{'='*80}")
    print(f"📦 ZUSAMMENFASSUNG")
    print(f"{'='*80}")
    print(f"Positionen: {len(positions)}\n")

    for pos in positions:
        status = []
        status.append(f"Pos {pos['orderNumber']}")
        if pos['hsCode']:
            status.append(f"HS:{pos['hsCode']}")
        if pos['netWeight']:
            status.append(f"Netto:{pos['netWeight']}kg")
        if pos['grossWeight']:
            status.append(f"Brutto:{pos['grossWeight']}kg")
        if pos['procedure']:
            status.append(f"Verf:{pos['procedure']}")

        print(f"  {' | '.join(status)}")

    print(f"\n{'='*80}")
    print(f"✅ TEST ABGESCHLOSSEN")
    print(f"{'='*80}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python extractors_layout.py <pdf_file>")
        print()
        print("Beispiel:")
        print("  python extractors_layout.py uploads/ausfuhr_fr.pdf")
        sys.exit(1)

    test_layout_extractor(sys.argv[1])
