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

        Args:
            image: PIL Image
            page_num: Seitennummer

        Returns:
            (blocks, all_words) - Liste von Blöcken und allen Wörtern
        """
        if self.debug:
            print(f"\n{'='*80}")
            print(f"🔍 LAYOUT-ANALYSE: Seite {page_num + 1}")
            print(f"{'='*80}")

        # 1. Konvertiere zu OpenCV Format
        cv_image = self._pil_to_cv2(image)

        # 2. Finde Linien und Rechtecke
        blocks = self._detect_blocks(cv_image, page_num)

        # 3. OCR mit Bounding Boxes
        words = self._extract_text_with_positions(image)

        # 4. Ordne Wörter den Blöcken zu
        self._assign_words_to_blocks(words, blocks)

        if self.debug:
            print(f"\n✅ Analyse abgeschlossen:")
            print(f"   {len(blocks)} Blöcke gefunden")
            print(f"   {len(words)} Wörter extrahiert")

        return blocks, words

    def _pil_to_cv2(self, pil_image: Image.Image) -> np.ndarray:
        """Konvertiert PIL Image zu OpenCV Format"""
        return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    def _detect_blocks(self, cv_image: np.ndarray, page_num: int) -> List[LayoutBlock]:
        """
        Erkennt rechteckige Blöcke durch Linien-Detektion

        Strategie:
        1. Grayscale + Binary
        2. Finde horizontale Linien
        3. Finde vertikale Linien
        4. Kombiniere zu Rechtecken
        """
        if self.debug:
            print(f"\n📐 Linien-Erkennung...")

        # Grayscale
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)

        # Binary (Threshold)
        _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

        # Horizontale Linien erkennen
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

        # Vertikale Linien erkennen
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

        # Kombiniere Linien
        combined = cv2.add(horizontal_lines, vertical_lines)

        # Finde Konturen (= Rechtecke/Blöcke)
        contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        blocks = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)

            # Filter: Nur Blöcke mit Mindestgröße
            if w > 50 and h > 20:
                block = LayoutBlock(x, y, w, h, page_num)
                blocks.append(block)

        # Sortiere Blöcke: Oben nach Unten, Links nach Rechts
        blocks.sort(key=lambda b: (b.y, b.x))

        if self.debug:
            print(f"   ✓ {len(blocks)} Blöcke gefunden")
            for i, block in enumerate(blocks[:5]):  # Zeige erste 5
                print(f"      Block {i+1}: {block}")

        return blocks

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

    def _assign_words_to_blocks(self, words: List[TextWord], blocks: List[LayoutBlock]):
        """
        Ordnet Wörter den Blöcken zu basierend auf Position

        Strategie:
        - Prüfe für jedes Wort: In welchem Block liegt es?
        - Falls in mehreren: Nimm den kleinsten Block
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
