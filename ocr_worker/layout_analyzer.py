"""
Layout-basierte OCR-Analyse
============================

Kombiniert:
1. OpenCV - Visuelle Struktur (Linien, Blöcke, Rechtecke)
2. Tesseract - Text mit Bounding Boxes
3. Code-Logik - Feld-Identifikation

Ziel: EU-Zolldokumente (EX1) strukturiert analysieren
"""

import cv2
import numpy as np
from PIL import Image
import pytesseract
from typing import List, Dict, Tuple, Optional
import os


class LayoutBlock:
    """Repräsentiert einen rechteckigen Block im Dokument"""

    def __init__(self, x: int, y: int, width: int, height: int, page: int = 0):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.page = page
        self.words = []  # Liste von TextWord Objekten
        self.field_codes = []  # z.B. ['(32)', '(33)']

    def contains_point(self, x: int, y: int) -> bool:
        """Prüft ob Punkt (x,y) innerhalb des Blocks ist"""
        return (self.x <= x <= self.x + self.width and
                self.y <= y <= self.y + self.height)

    def get_text(self) -> str:
        """Gibt den kompletten Text des Blocks zurück"""
        return ' '.join([w.text for w in self.words])

    def __repr__(self):
        return f"Block({self.x},{self.y} {self.width}x{self.height}, {len(self.words)} words)"


class TextWord:
    """Repräsentiert ein Wort mit Position"""

    def __init__(self, text: str, x: int, y: int, width: int, height: int, conf: int):
        self.text = text
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.conf = conf  # Confidence 0-100

    def __repr__(self):
        return f"'{self.text}'@({self.x},{self.y})"


class LayoutAnalyzer:
    """Analysiert PDF-Seiten mit visueller Struktur"""

    def __init__(self, tesseract_cmd: str = None, languages: str = 'deu+fra+eng'):
        """
        Args:
            tesseract_cmd: Pfad zu tesseract.exe (Windows)
            languages: Sprachen für OCR (z.B. 'deu+fra+eng')
        """
        if tesseract_cmd and os.name == 'nt':
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        self.languages = languages
        self.debug = False

    def analyze_image(self, image: Image.Image, page_num: int = 0) -> Tuple[List[LayoutBlock], List[TextWord]]:
        """
        Analysiert ein Bild und extrahiert Blöcke + Text mit Position

        HYBRID-STRATEGIE (Option A + B):
        1. Versuche physische Blöcke zu finden (OpenCV Linien-Erkennung)
        2. Falls nicht genug Positions-Blöcke → Erstelle virtuelle Blöcke um (32) Codes
        3. Kombiniere beide für optimales Ergebnis

        Args:
            image: PIL Image
            page_num: Seitennummer

        Returns:
            (blocks, all_words) - Liste von Blöcken und allen Wörtern
        """
        if self.debug:
            print(f"\n{'='*80}")
            print(f"🔍 LAYOUT-ANALYSE: Seite {page_num + 1} (HYBRID)")
            print(f"{'='*80}")

        # 1. Konvertiere zu OpenCV Format
        cv_image = self._pil_to_cv2(image)

        # 2. OPTION A: Finde physische Linien und Rechtecke
        physical_blocks = self._detect_blocks(cv_image, page_num)

        # 3. OCR mit Bounding Boxes
        words = self._extract_text_with_positions(image)

        # 4. OPTION B: Erstelle virtuelle Blöcke um (32) Codes (für Positions-Seiten)
        # Zähle wie viele (32) Codes in physischen Blöcken sind
        has_position_codes = any('(32)' in w.text for w in words)

        virtual_blocks = []
        if has_position_codes:
            virtual_blocks = self._create_virtual_blocks_around_field_codes(
                words, page_num, field_code='(32)', image_height=image.height
            )

        # 5. STRATEGIE: Kombiniere physische + virtuelle Blöcke
        # Wenn virtuelle Blöcke vorhanden und sinnvoll (>1 Block), verwende diese
        if len(virtual_blocks) > 1:
            if self.debug:
                print(f"\n💡 Verwende {len(virtual_blocks)} virtuelle Blöcke (besser für Positionen)")
            all_blocks = virtual_blocks
        else:
            if self.debug:
                print(f"\n💡 Verwende {len(physical_blocks)} physische Blöcke")
            all_blocks = physical_blocks

        # 6. Ordne Wörter den finalen Blöcken zu
        self._assign_words_to_blocks(words, all_blocks)

        if self.debug:
            print(f"\n✅ Analyse abgeschlossen:")
            print(f"   {len(all_blocks)} finale Blöcke")
            print(f"   {len(words)} Wörter extrahiert")
            blocks_with_32 = [b for b in all_blocks if '(32)' in b.field_codes]
            print(f"   {len(blocks_with_32)} Blöcke mit (32) Position-Codes")

        return all_blocks, words

    def _pil_to_cv2(self, pil_image: Image.Image) -> np.ndarray:
        """Konvertiert PIL Image zu OpenCV Format"""
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    def _detect_blocks(self, cv_image: np.ndarray, page_num: int) -> List[LayoutBlock]:
        """
        Erkennt rechteckige Blöcke durch Linien-Detektion (OPTION A - VERBESSERT)

        Strategie:
        1. Multi-Level Linien-Erkennung (grobe + feine Linien)
        2. Finde horizontale Linien (verschiedene Längen)
        3. Finde vertikale Linien (verschiedene Längen)
        4. Kombiniere zu Rechtecken
        5. Filtere und sortiere Blöcke
        """
        if self.debug:
            print(f"\n📐 Linien-Erkennung (Multi-Level)...")

        # Grayscale
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)

        # Binary (Threshold) - mit adaptivem Threshold für bessere Erkennung
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

        blocks = []

        # STUFE 1: Grobe Linien (lange Linien für große Blöcke)
        h_kernel_coarse = cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1))
        v_kernel_coarse = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 60))

        h_lines_coarse = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel_coarse, iterations=2)
        v_lines_coarse = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel_coarse, iterations=2)

        combined_coarse = cv2.add(h_lines_coarse, v_lines_coarse)
        contours_coarse, _ = cv2.findContours(combined_coarse, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours_coarse:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 100 and h > 50:  # Größere Mindestgröße für grobe Blöcke
                blocks.append(LayoutBlock(x, y, w, h, page_num))

        # STUFE 2: Feine Linien (kurze Linien für kleine Blöcke)
        h_kernel_fine = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 1))
        v_kernel_fine = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 25))

        h_lines_fine = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel_fine, iterations=1)
        v_lines_fine = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel_fine, iterations=1)

        combined_fine = cv2.add(h_lines_fine, v_lines_fine)
        contours_fine, _ = cv2.findContours(combined_fine, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours_fine:
            x, y, w, h = cv2.boundingRect(contour)
            if w > 50 and h > 20:  # Kleinere Mindestgröße für feine Blöcke
                blocks.append(LayoutBlock(x, y, w, h, page_num))

        # STUFE 3: Entferne Duplikate (überlappende Blöcke)
        blocks = self._remove_duplicate_blocks(blocks)

        # Sortiere Blöcke: Oben nach Unten, Links nach Rechts
        blocks.sort(key=lambda b: (b.y, b.x))

        if self.debug:
            print(f"   ✓ {len(blocks)} physische Blöcke gefunden")
            for i, block in enumerate(blocks[:10]):  # Zeige erste 10
                print(f"      Block {i+1}: {block}")

        return blocks

    def _remove_duplicate_blocks(self, blocks: List[LayoutBlock]) -> List[LayoutBlock]:
        """
        Entfernt überlappende/duplizierte Blöcke

        Strategie: Wenn Block A >80% von Block B überlappt, behalte nur den kleineren
        """
        unique_blocks = []

        for block in blocks:
            is_duplicate = False

            for existing in unique_blocks:
                overlap = self._calculate_overlap(block, existing)

                # Wenn >80% Überlappung, ist es ein Duplikat
                if overlap > 0.8:
                    is_duplicate = True
                    # Ersetze mit kleinerem Block (spezifischer)
                    if block.width * block.height < existing.width * existing.height:
                        unique_blocks.remove(existing)
                        unique_blocks.append(block)
                    break

            if not is_duplicate:
                unique_blocks.append(block)

        return unique_blocks

    def _calculate_overlap(self, block1: LayoutBlock, block2: LayoutBlock) -> float:
        """
        Berechnet Überlappung zwischen zwei Blöcken (0.0 - 1.0)
        """
        x1_min, x1_max = block1.x, block1.x + block1.width
        y1_min, y1_max = block1.y, block1.y + block1.height

        x2_min, x2_max = block2.x, block2.x + block2.width
        y2_min, y2_max = block2.y, block2.y + block2.height

        # Überlappungs-Rechteck
        x_overlap = max(0, min(x1_max, x2_max) - max(x1_min, x2_min))
        y_overlap = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))

        overlap_area = x_overlap * y_overlap

        # Kleinere Block-Fläche als Referenz
        area1 = block1.width * block1.height
        area2 = block2.width * block2.height
        smaller_area = min(area1, area2)

        if smaller_area == 0:
            return 0.0

        return overlap_area / smaller_area

    def _extract_text_with_positions(self, image: Image.Image) -> List[TextWord]:
        """
        Extrahiert Text mit Bounding Boxes via Tesseract

        Returns:
            Liste von TextWord Objekten
        """
        if self.debug:
            print(f"\n📝 Text-Extraktion mit Bounding Boxes...")

        # Tesseract: image_to_data gibt Dict mit Wort-Positionen
        data = pytesseract.image_to_data(
            image,
            lang=self.languages,
            config='--oem 3 --psm 6',
            output_type=pytesseract.Output.DICT
        )

        words = []
        n_boxes = len(data['text'])

        for i in range(n_boxes):
            text = data['text'][i].strip()
            conf = int(data['conf'][i])

            # Überspringe leere oder sehr unsichere Wörter
            if not text or conf < 10:
                continue

            x = data['left'][i]
            y = data['top'][i]
            w = data['width'][i]
            h = data['height'][i]

            word = TextWord(text, x, y, w, h, conf)
            words.append(word)

        if self.debug:
            print(f"   ✓ {len(words)} Wörter extrahiert")
            # Zeige erste paar Wörter
            for word in words[:10]:
                print(f"      {word}")

        return words

    def _create_virtual_blocks_around_field_codes(self, words: List[TextWord], page_num: int,
                                                   field_code: str = '(32)', image_height: int = 3000) -> List[LayoutBlock]:
        """
        Erstellt virtuelle Blöcke um spezifische Feld-Codes (OPTION B)

        Strategie:
        1. Finde alle Wörter mit dem Feld-Code (z.B. "(32)")
        2. Erstelle um jeden Code einen virtuellen Block
        3. Block geht vom Code bis zum nächsten Code (oder Seitenende)
        4. Block-Breite = Seitenbreite

        Args:
            words: Liste aller Wörter
            page_num: Seitennummer
            field_code: Feld-Code zum Suchen (z.B. "(32)")
            image_height: Bild-Höhe für Block-Berechnung

        Returns:
            Liste virtueller Blöcke
        """
        if self.debug:
            print(f"\n🎯 Erstelle virtuelle Blöcke um '{field_code}'...")

        # Finde alle Wörter mit dem Feld-Code
        code_words = [w for w in words if field_code in w.text]

        if not code_words:
            if self.debug:
                print(f"   ✗ Keine '{field_code}' Codes gefunden")
            return []

        # Sortiere nach Y-Position (oben nach unten)
        code_words.sort(key=lambda w: w.y)

        virtual_blocks = []

        for i, code_word in enumerate(code_words):
            # Block startet beim Code
            block_y = code_word.y - 50  # Etwas Puffer nach oben

            # Block endet beim nächsten Code (oder Seitenende)
            if i + 1 < len(code_words):
                block_height = code_words[i + 1].y - block_y
            else:
                # Letzter Block geht bis Seitenende
                block_height = image_height - block_y

            # Block-Breite = volle Seitenbreite
            block_x = 0
            block_width = 2400  # Typische PDF-Breite bei 300 DPI

            # Mindesthöhe
            if block_height < 100:
                block_height = 100

            virtual_block = LayoutBlock(block_x, block_y, block_width, block_height, page_num)
            virtual_blocks.append(virtual_block)

        if self.debug:
            print(f"   ✓ {len(virtual_blocks)} virtuelle Blöcke erstellt")
            for i, block in enumerate(virtual_blocks):
                print(f"      VBlock {i+1}: {block}")

        return virtual_blocks

    def _assign_words_to_blocks(self, words: List[TextWord], blocks: List[LayoutBlock]):
        """
        Ordnet Wörter den Blöcken zu basierend auf Position

        Strategie:
        - Prüfe für jedes Wort: In welchem Block liegt es?
        - Falls in mehreren: Nimm den kleinsten Block (spezifischster)
        """
        if self.debug:
            print(f"\n🔗 Ordne Wörter zu Blöcken...")

        for word in words:
            # Mitte des Wortes
            word_center_x = word.x + word.width // 2
            word_center_y = word.y + word.height // 2

            # Finde passende Blöcke
            matching_blocks = [b for b in blocks if b.contains_point(word_center_x, word_center_y)]

            if matching_blocks:
                # Nimm kleinsten Block (spezifischster)
                best_block = min(matching_blocks, key=lambda b: b.width * b.height)
                best_block.words.append(word)

                # Erkenne Feld-Codes wie (32), (33), (2), (8)
                if '(' in word.text and ')' in word.text:
                    best_block.field_codes.append(word.text)

        if self.debug:
            blocks_with_words = [b for b in blocks if b.words]
            print(f"   ✓ {len(blocks_with_words)} Blöcke enthalten Text")
            for i, block in enumerate(blocks_with_words[:5]):
                print(f"      Block {i+1}: {len(block.words)} Wörter, Codes: {block.field_codes}")


def test_layout_analyzer(image_path: str):
    """Test-Funktion für Layout-Analyse"""
    from pdf2image import convert_from_path

    print(f"{'='*80}")
    print(f"🧪 TEST: LAYOUT-ANALYSE")
    print(f"Datei: {os.path.basename(image_path)}")
    print(f"{'='*80}")

    # PDF zu Bildern
    if image_path.endswith('.pdf'):
        images = convert_from_path(image_path, dpi=300)
    else:
        images = [Image.open(image_path)]

    # Analyzer erstellen
    analyzer = LayoutAnalyzer(
        tesseract_cmd=r'C:\Program Files\Tesseract-OCR\tesseract.exe' if os.name == 'nt' else None,
        languages='deu+fra+eng'
    )
    analyzer.debug = True

    # Analysiere jede Seite
    for page_num, image in enumerate(images):
        blocks, words = analyzer.analyze_image(image, page_num)

        # Zeige Blöcke mit Feld-Codes
        print(f"\n{'='*80}")
        print(f"📦 BLÖCKE MIT FELD-CODES (Seite {page_num + 1}):")
        print(f"{'='*80}")

        for i, block in enumerate(blocks):
            if block.field_codes:
                print(f"\nBlock {i+1} @ ({block.x}, {block.y}):")
                print(f"  Codes: {block.field_codes}")
                text = block.get_text()
                print(f"  Text: {text[:100]}...")

    print(f"\n{'='*80}")
    print(f"✅ TEST ABGESCHLOSSEN")
    print(f"{'='*80}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python layout_analyzer.py <pdf_or_image_file>")
        print()
        print("Beispiel:")
        print("  python layout_analyzer.py uploads/ausfuhr_fr.pdf")
        sys.exit(1)

    test_layout_analyzer(sys.argv[1])
