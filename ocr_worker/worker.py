"""
OCR Worker - Hauptlogik
Verarbeitet PDFs/Bilder mit PaddleOCR und speichert Ergebnisse in PostgreSQL
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import Json
from pdf2image import convert_from_path
from PIL import Image
from paddleocr import PaddleOCR

from config import celery_app, DATABASE_URL, PADDLE_USE_GPU, PADDLE_LANG
from extractors import (
    extract_mrn,
    extract_procedure_codes,
    classify_procedure_type,
    extract_hs_codes,
    extract_weights,
    extract_packages,
    extract_value_and_currency,
    extract_invoice_numbers,
    extract_address,
    detect_document_type,
    parse_positions_table,
    optimize_addresses
)


# PaddleOCR initialisieren (nur einmal beim Worker-Start)
ocr_engine = None


def get_ocr_engine():
    """Lazy loading von PaddleOCR"""
    global ocr_engine
    if ocr_engine is None:
        # PaddleOCR 3.x - nur kompatible Parameter verwenden
        ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang=PADDLE_LANG
        )
    return ocr_engine


def get_db_connection():
    """PostgreSQL Verbindung herstellen"""
    return psycopg2.connect(DATABASE_URL)


def update_ocr_document_status(doc_id: str, status: str, progress: int = None, error: str = None):
    """Aktualisiert Status eines OcrDocument"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if error:
            cur.execute(
                'UPDATE "OcrDocument" SET status = %s, progress = %s, "errorMessage" = %s, "updatedAt" = %s WHERE id = %s',
                (status, progress or 0, error, datetime.now(), doc_id)
            )
        elif progress is not None:
            cur.execute(
                'UPDATE "OcrDocument" SET status = %s, progress = %s, "updatedAt" = %s WHERE id = %s',
                (status, progress, datetime.now(), doc_id)
            )
        else:
            cur.execute(
                'UPDATE "OcrDocument" SET status = %s, "updatedAt" = %s WHERE id = %s',
                (status, datetime.now(), doc_id)
            )

        conn.commit()
    finally:
        cur.close()
        conn.close()


def pdf_to_images(pdf_path: str) -> List[Image.Image]:
    """
    Konvertiert PDF zu Liste von Bildern

    Args:
        pdf_path: Pfad zur PDF-Datei

    Returns:
        Liste von PIL Images
    """
    try:
        images = convert_from_path(pdf_path, dpi=300)
        return images
    except Exception as e:
        print(f"Fehler beim PDF-Konvertieren: {e}")
        return []


def ocr_image(image: Image.Image) -> str:
    """
    Führt OCR auf einem Bild aus

    Args:
        image: PIL Image

    Returns:
        Extrahierter Text
    """
    ocr = get_ocr_engine()

    # PaddleOCR erwartet Pfad oder numpy array
    import numpy as np
    img_array = np.array(image)

    # PaddleOCR 3.x - ocr() ohne cls Argument
    result = ocr.ocr(img_array)

    # Text aus Ergebnis extrahieren
    text_lines = []
    if result and len(result) > 0:
        for line in result[0]:
            if line:
                text_lines.append(line[1][0])  # [1][0] = erkannter Text

    return '\n'.join(text_lines)


def process_document(file_path: str, doc_id: str) -> Dict[str, Any]:
    """
    Verarbeitet ein Dokument (PDF oder Bild) mit OCR

    Args:
        file_path: Pfad zur Datei
        doc_id: OcrDocument ID

    Returns:
        Dict mit extrahierten Daten
    """
    update_ocr_document_status(doc_id, 'processing', 10)

    # 1. PDF zu Bildern konvertieren (falls PDF)
    images = []
    if file_path.lower().endswith('.pdf'):
        print(f"Konvertiere PDF zu Bildern: {file_path}")
        images = pdf_to_images(file_path)
        update_ocr_document_status(doc_id, 'processing', 20)
    else:
        # Direktes Bild
        images = [Image.open(file_path)]
        update_ocr_document_status(doc_id, 'processing', 20)

    if not images:
        raise Exception("Keine Bilder zum Verarbeiten gefunden")

    # 2. OCR auf allen Seiten ausführen
    print(f"Führe OCR auf {len(images)} Seite(n) aus...")
    all_text = []
    page_progress = 60 / len(images)  # 20% -> 80% für OCR

    for i, image in enumerate(images):
        print(f"  Seite {i + 1}/{len(images)}")
        page_text = ocr_image(image)
        all_text.append(page_text)

        current_progress = 20 + int((i + 1) * page_progress)
        update_ocr_document_status(doc_id, 'processing', current_progress)

    full_text = '\n\n=== NEUE SEITE ===\n\n'.join(all_text)

    # DEBUG: OCR-Text speichern für Debugging
    debug_file = os.path.join(UPLOAD_FOLDER, f'ocr_debug_{doc_id}.txt')
    with open(debug_file, 'w', encoding='utf-8') as f:
        f.write(full_text)
    print(f"✅ OCR-Text gespeichert: {debug_file}")
    print(f"📄 Erste 500 Zeichen:\n{full_text[:500]}")

    update_ocr_document_status(doc_id, 'processing', 80)

    # 3. Daten extrahieren
    print("Extrahiere strukturierte Daten...")
    extracted_data = extract_data_from_text(full_text)

    update_ocr_document_status(doc_id, 'processing', 90)

    return extracted_data


def extract_data_from_text(text: str) -> Dict[str, Any]:
    """
    Extrahiert strukturierte Daten aus OCR-Text

    Returns:
        Dict mit allen extrahierten Daten
    """
    # Basis-Extraktion
    mrn = extract_mrn(text)
    document_type = detect_document_type(text)
    procedure_codes = extract_procedure_codes(text)
    procedure_type = classify_procedure_type(procedure_codes)

    # Adressen
    sender = extract_address(text, marker='Sender:') or extract_address(text, marker='Consignor:')
    receiver = extract_address(text, marker='Empfänger:') or extract_address(text, marker='Consignee:')

    # Totals
    brutto_weight, netto_weight = extract_weights(text)
    total_packages = extract_packages(text)
    total_value, currency = extract_value_and_currency(text)
    invoice_numbers = extract_invoice_numbers(text)

    # Positionen parsen (aus Tabelle)
    positions = parse_positions_table(text)

    # Procedure Type für jede Position
    for pos in positions:
        if pos.get('procedure'):
            pos_codes = [pos['procedure']]
            pos['procedureType'] = classify_procedure_type(pos_codes)

    # Adressen optimieren (common vs individual)
    common_sender, common_receiver, optimized_positions = optimize_addresses(positions)

    # Falls keine Adressen aus Positionen, nutze die globalen
    if not common_sender:
        common_sender = sender
    if not common_receiver:
        common_receiver = receiver

    return {
        'mrn': mrn,
        'documentType': document_type,
        'procedureType': procedure_type,
        'commonSender': common_sender,
        'commonReceiver': common_receiver,
        'totalPackages': total_packages,
        'totalGrossWeight': brutto_weight,
        'totalNetWeight': netto_weight,
        'totalValue': total_value,
        'currency': currency,
        'invoiceNumbers': invoice_numbers,
        'positions': optimized_positions
    }


def save_shipment_to_db(doc_id: str, clearance_id: str, data: Dict[str, Any]) -> str:
    """
    Speichert extrahierte Shipment-Daten in PostgreSQL

    Returns:
        shipment_id
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Shipment erstellen
        shipment_id = f"ship_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

        cur.execute('''
            INSERT INTO "Shipment" (
                id, "ocrDocumentId", "clearanceId", mrn, "documentType", "procedureType",
                "commonSender", "commonReceiver", "totalPackages", "totalGrossWeight",
                "totalNetWeight", "totalValue", currency, "invoiceNumbers",
                verified, "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        ''', (
            shipment_id,
            doc_id,
            clearance_id,
            data.get('mrn'),
            data.get('documentType'),
            data.get('procedureType'),
            Json(data.get('commonSender')) if data.get('commonSender') else None,
            Json(data.get('commonReceiver')) if data.get('commonReceiver') else None,
            data.get('totalPackages'),
            data.get('totalGrossWeight'),
            data.get('totalNetWeight'),
            data.get('totalValue'),
            data.get('currency'),
            data.get('invoiceNumbers', []),
            False,  # verified
            datetime.now(),
            datetime.now()
        ))

        # 2. Positionen erstellen
        positions = data.get('positions', [])
        for pos in positions:
            position_id = f"pos_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

            cur.execute('''
                INSERT INTO "ShipmentPosition" (
                    id, "shipmentId", "orderNumber", "hsCode", description,
                    "netWeight", "grossWeight", procedure, "procedureType",
                    sender, receiver, value, currency, "invoiceNumber",
                    "createdAt", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            ''', (
                position_id,
                shipment_id,
                pos.get('orderNumber', 0),
                pos.get('hsCode', ''),
                pos.get('description', ''),
                pos.get('netWeight', 0.0),
                pos.get('grossWeight', 0.0),
                pos.get('procedure'),
                pos.get('procedureType'),
                Json(pos.get('sender')) if pos.get('sender') else None,
                Json(pos.get('receiver')) if pos.get('receiver') else None,
                pos.get('value'),
                pos.get('currency'),
                pos.get('invoiceNumber'),
                datetime.now(),
                datetime.now()
            ))

        conn.commit()
        print(f"✅ Shipment gespeichert: {shipment_id} mit {len(positions)} Positionen")
        return shipment_id

    except Exception as e:
        conn.rollback()
        print(f"❌ Fehler beim Speichern: {e}")
        raise
    finally:
        cur.close()
        conn.close()


@celery_app.task(bind=True)
def process_ocr_document(self, doc_id: str, file_path: str, clearance_id: str):
    """
    Celery Task: Verarbeitet ein Dokument mit OCR

    Args:
        doc_id: OcrDocument ID in der Datenbank
        file_path: Pfad zur hochgeladenen Datei
        clearance_id: Zugehörige Clearance ID
    """
    print(f"\n{'='*60}")
    print(f"🚀 Starte OCR-Verarbeitung")
    print(f"   Document ID: {doc_id}")
    print(f"   File: {file_path}")
    print(f"   Clearance: {clearance_id}")
    print(f"{'='*60}\n")

    try:
        # 1. Status auf "processing" setzen
        update_ocr_document_status(doc_id, 'processing', 5)

        # 2. Prüfen ob Datei existiert
        if not os.path.exists(file_path):
            raise Exception(f"Datei nicht gefunden: {file_path}")

        # 3. OCR durchführen und Daten extrahieren
        extracted_data = process_document(file_path, doc_id)

        # 4. In Datenbank speichern
        print("Speichere in Datenbank...")
        shipment_id = save_shipment_to_db(doc_id, clearance_id, extracted_data)

        # 5. Status auf "completed" setzen
        update_ocr_document_status(doc_id, 'completed', 100)

        # 6. processedAt timestamp setzen
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            'UPDATE "OcrDocument" SET "processedAt" = %s WHERE id = %s',
            (datetime.now(), doc_id)
        )
        conn.commit()
        cur.close()
        conn.close()

        print(f"\n{'='*60}")
        print(f"✅ OCR-Verarbeitung erfolgreich!")
        print(f"   Shipment ID: {shipment_id}")
        print(f"   MRN: {extracted_data.get('mrn', 'N/A')}")
        print(f"   Typ: {extracted_data.get('documentType', 'N/A')}")
        print(f"   Positionen: {len(extracted_data.get('positions', []))}")
        print(f"{'='*60}\n")

        return {
            'success': True,
            'shipment_id': shipment_id,
            'extracted_data': extracted_data
        }

    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ Fehler bei OCR-Verarbeitung:")
        print(f"   {str(e)}")
        print(f"{'='*60}\n")

        # Status auf "failed" setzen
        update_ocr_document_status(doc_id, 'failed', 0, str(e))

        # Task als fehlgeschlagen markieren
        raise
