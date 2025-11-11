"""
OCR Worker - Hauptlogik
Verarbeitet PDFs/Bilder mit Tesseract OCR und speichert Ergebnisse in PostgreSQL
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import Json
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
import fitz  # PyMuPDF

from config import celery_app, DATABASE_URL, TESSERACT_CMD, TESSERACT_LANG, TESSERACT_CONFIG, UPLOAD_FOLDER
from extractors_smart import (
    extract_mrn,
    extract_sender_smart,
    extract_receiver_smart,
    extract_hs_codes_smart,
    extract_total_gross_weight_smart,
    extract_total_packages,
    extract_countries_smart,
    extract_positions_smart,
    detect_document_type,
    classify_procedure_type_smart
)


# Tesseract OCR konfigurieren
if os.name == 'nt':  # Windows
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


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
    Führt OCR auf einem Bild aus mit Tesseract

    Args:
        image: PIL Image

    Returns:
        Extrahierter Text
    """
    try:
        # Tesseract OCR mit deutscher Sprache und Konfiguration
        text = pytesseract.image_to_string(
            image,
            lang=TESSERACT_LANG,
            config=TESSERACT_CONFIG
        )
        return text
    except Exception as e:
        print(f"⚠️ Tesseract OCR fehlgeschlagen: {e}")
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extrahiert Text direkt aus einem PDF mit PyMuPDF (ohne OCR)

    Args:
        file_path: Pfad zur PDF-Datei

    Returns:
        Extrahierter Text oder leerer String bei Fehler
    """
    try:
        all_text = []
        doc = fitz.open(file_path)

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text and len(text.strip()) > 0:
                all_text.append(text)

        doc.close()
        return '\n\n=== NEUE SEITE ===\n\n'.join(all_text)
    except Exception as e:
        print(f"⚠️ PDF-Text-Extraktion fehlgeschlagen: {e}")
        return ""


def process_document(file_path: str, doc_id: str) -> Dict[str, Any]:
    """
    Verarbeitet ein Dokument (PDF oder Bild) mit direkter Text-Extraktion oder OCR

    Args:
        file_path: Pfad zur Datei
        doc_id: OcrDocument ID

    Returns:
        Dict mit extrahierten Daten
    """
    update_ocr_document_status(doc_id, 'processing', 10)

    full_text = ""

    # 1. Versuche zuerst direkte Text-Extraktion für PDFs
    if file_path.lower().endswith('.pdf'):
        print(f"📄 Versuche direkte PDF-Text-Extraktion: {file_path}")
        full_text = extract_text_from_pdf(file_path)

        # Prüfe ob genug Text extrahiert wurde (mindestens 100 Zeichen)
        if len(full_text.strip()) >= 100:
            print(f"✅ PDF-Text-Extraktion erfolgreich! ({len(full_text)} Zeichen)")
            print(f"📄 Erste 500 Zeichen:\n{full_text[:500]}")
            update_ocr_document_status(doc_id, 'processing', 80)
        else:
            print(f"⚠️ Zu wenig Text extrahiert ({len(full_text)} Zeichen), verwende OCR...")
            full_text = ""  # Reset für OCR

    # 2. Falls PDF-Extraktion fehlschlug oder es ein Bild ist, verwende OCR
    if not full_text:
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

        # OCR auf allen Seiten ausführen
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
    Extrahiert strukturierte Daten aus OCR-Text mit smarten Extraktoren

    Returns:
        Dict mit allen extrahierten Daten
    """
    print("\n" + "="*60)
    print("🔍 STARTE DATEN-EXTRAKTION MIT SMARTEN EXTRAKTOREN")
    print("="*60)

    # Basis-Extraktion
    mrn = extract_mrn(text)
    print(f"✓ MRN: {mrn}")

    document_type = detect_document_type(text)
    print(f"✓ Dokumenttyp: {document_type}")

    # HS-Codes (benötigt für Positionen)
    hs_codes = extract_hs_codes_smart(text)
    print(f"✓ HS-Codes gefunden: {len(hs_codes)} -> {hs_codes}")

    # Positionen mit HS-Codes
    positions = extract_positions_smart(text, hs_codes)
    print(f"✓ Positionen extrahiert: {len(positions)}")

    # Procedure Type aus Positionen ableiten
    procedure_type = None
    if positions:
        procedure_type = classify_procedure_type_smart(positions)
    print(f"✓ Verfahrenstyp: {procedure_type}")

    # Adressen (smart)
    sender = extract_sender_smart(text)
    print(f"✓ Absender: {sender.get('name') if sender else 'None'}")

    receiver = extract_receiver_smart(text)
    print(f"✓ Empfänger: {receiver.get('name') if receiver else 'None'}")

    # Länder
    origin_country, dest_country = extract_countries_smart(text)
    print(f"✓ Länder: {origin_country} → {dest_country}")

    # Totals
    total_gross_weight = extract_total_gross_weight_smart(text)
    print(f"✓ Rohmasse: {total_gross_weight} kg")

    total_packages = extract_total_packages(text)
    print(f"✓ Packstücke: {total_packages}")

    # Nettomasse aus Positionen berechnen
    total_net_weight = sum(pos.get('netWeight', 0) for pos in positions) if positions else None
    if total_net_weight == 0:
        total_net_weight = None

    print("="*60)
    print(f"✅ EXTRAKTION ABGESCHLOSSEN")
    print(f"   Positionen: {len(positions)}")
    print(f"   Absender: {'✓' if sender else '✗'}")
    print(f"   Empfänger: {'✓' if receiver else '✗'}")
    print("="*60 + "\n")

    return {
        'mrn': mrn,
        'documentType': document_type,
        'procedureType': procedure_type,
        'commonSender': sender,
        'commonReceiver': receiver,
        'commonOriginCountry': origin_country,
        'commonDestCountry': dest_country,
        'totalPackages': total_packages,
        'totalGrossWeight': total_gross_weight,
        'totalNetWeight': total_net_weight,
        'totalValue': None,  # Wird später implementiert
        'currency': None,
        'invoiceNumbers': [],
        'positions': positions
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
                "commonSender", "commonReceiver", "commonOriginCountry", "commonDestCountry",
                "totalPackages", "totalGrossWeight", "totalNetWeight", "totalValue",
                currency, "invoiceNumbers", verified, "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
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
            data.get('commonOriginCountry'),
            data.get('commonDestCountry'),
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
