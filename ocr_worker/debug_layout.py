#!/usr/bin/env python3
"""
Debug-Script: Zeigt Layout-Struktur eines PDFs
"""
import sys
from pdf2image import convert_from_path
from layout_analyzer import LayoutAnalyzer

def debug_layout(pdf_path: str):
    print("="*80)
    print(f"🔍 LAYOUT-ANALYSE: {pdf_path}")
    print("="*80)

    # PDF zu Bildern
    images = convert_from_path(pdf_path, dpi=300)
    analyzer = LayoutAnalyzer()

    for page_num, image in enumerate(images, 1):
        print(f"\n{'='*80}")
        print(f"📄 SEITE {page_num}")
        print(f"{'='*80}")

        blocks, all_words = analyzer.analyze_image(image, page_num - 1)

        print(f"\n📦 {len(blocks)} Blöcke gefunden:")
        for i, block in enumerate(blocks, 1):
            print(f"\n  Block {i}:")
            print(f"    Position: x={block.x}, y={block.y}, w={block.width}, h={block.height}")
            print(f"    Feldcodes: {block.field_codes}")
            print(f"    Wörter: {len(block.words)}")
            if len(block.words) > 0:
                print(f"    Erste 20 Wörter: {[w.text for w in block.words[:20]]}")

        # Suche nach wichtigen Feldcodes in ALLEN Wörtern
        print(f"\n🔍 Feldcode-Positionen in allen {len(all_words)} Wörtern:")
        for code in ['(2)', '(8)', '(32)', '(33)', '(35)', '(37)', '(38)']:
            positions = [i for i, w in enumerate(all_words) if code in w.text]
            if positions:
                print(f"  {code}: Gefunden bei Wort-Index {positions}")
                for pos in positions[:3]:  # Zeige erste 3
                    context = [all_words[j].text for j in range(max(0, pos-3), min(pos+4, len(all_words)))]
                    print(f"       Kontext: {context}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python debug_layout.py <pdf_path>")
        sys.exit(1)

    debug_layout(sys.argv[1])
