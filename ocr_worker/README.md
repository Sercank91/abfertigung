# OCR Worker für NCTS Abfertigung

Python Celery Worker für OCR-Verarbeitung von Zolldokumenten (EX1, T1, N821, Rechnungen).

## Features

- ✅ PDF zu Bild Konvertierung
- ✅ PaddleOCR für Text-Extraktion
- ✅ Intelligente Daten-Extraktion (MRN, Adressen, HS-Codes, Gewichte, etc.)
- ✅ T1/T2/T- Klassifizierung basierend auf Procedure Codes
- ✅ Automatische Adress-Optimierung (common vs individual)
- ✅ PostgreSQL Speicherung der extrahierten Daten
- ✅ Progress-Tracking via Redis
- ✅ Multi-Tenant Support

## Installation

### 1. Virtual Environment erstellen

```bash
cd ocr_worker
python -m venv ocr_env

# Windows PowerShell:
.\ocr_env\Scripts\Activate.ps1

# Windows CMD:
.\ocr_env\Scripts\activate.bat

# Linux/Mac:
source ocr_env/bin/activate
```

### 2. Dependencies installieren

```bash
pip install -r requirements.txt
```

**Hinweis für Windows:** Für `pdf2image` benötigst du Poppler:
- Download: https://github.com/oschwartz10612/poppler-windows/releases/
- Entpacke nach `C:\poppler`
- Füge `C:\poppler\Library\bin` zum PATH hinzu

### 3. Umgebungsvariablen konfigurieren

Kopiere `.env.example` zu `.env` und passe an:

```bash
cp .env.example .env
```

Editiere `.env`:
```env
REDIS_URL=redis://localhost:6379/0
DATABASE_URL=postgresql://username:password@localhost:5432/abfertigung
```

### 4. Redis starten

```bash
# Mit Docker:
docker run -d -p 6379:6379 --name redis redis:latest

# Oder Windows Service:
redis-server --service-start
```

## Worker starten

```bash
# Im ocr_worker Verzeichnis mit aktiviertem Virtual Environment:
celery -A worker worker --loglevel=info --pool=solo
```

**Windows PowerShell Tipp:** Verwende `--pool=solo` für bessere Kompatibilität auf Windows.

## Architektur

```
Next.js App
    ↓
Upload API Route
    ↓
Redis Queue (Celery)
    ↓
Python OCR Worker
    ↓ (PaddleOCR)
Extract Data
    ↓
PostgreSQL (Shipment + Positions)
```

## Extrahierte Daten

Der Worker extrahiert folgende Informationen:

### Shipment (Sendung)
- **MRN** (Movement Reference Number)
- **Dokumententyp** (EX1, T1, N821, Invoice)
- **Procedure Type** (T1, T2, T-)
- **Sender/Empfänger** (Name, Adresse, PLZ, Stadt, Land)
- **Totals** (Packstücke, Bruttogewicht, Nettogewicht, Wert, Währung)
- **Rechnungsnummern**

### ShipmentPosition (Position)
- **Laufende Nummer**
- **HS-Code** (Harmonized System Code)
- **Beschreibung**
- **Nettogewicht** / **Bruttogewicht**
- **Procedure Code** (1010, 1020, 3171, etc.)
- **Procedure Type** (T1, T2)
- **Individuelle Adressen** (falls abweichend)
- **Wert und Währung**
- **Rechnungsnummer**

## Business Logic

### T1/T2 Klassifizierung

- **T2**: Procedure Codes 1010, 1020, 1040 (EU-Waren)
- **T1**: Procedure Codes 3171, 3151 (Nicht-EU-Waren)
- **T-**: Gemischte Procedures (Mixed)

### Adress-Optimierung

- **Common**: Wenn ALLE Positionen die gleichen Sender/Empfänger haben
- **Individual**: Wenn mindestens eine Position abweicht

### Gewichtsverteilung

- **Bruttogewicht**: Nur bei orderNumber = 1 (erste Position)
- **Nettogewicht**: Auf alle Positionen verteilt

## Testing

```bash
# Worker im Testmodus starten (nur 1 Worker)
celery -A worker worker --loglevel=debug --concurrency=1 --pool=solo

# In einem anderen Terminal: Test-Job senden
python -c "from worker import process_ocr_document; process_ocr_document.delay('test-doc-id', 'test.pdf', 'clearance-123')"
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'paddle'"

```bash
pip install paddlepaddle paddleocr
```

### "pdf2image: Unable to get page count"

Installiere Poppler für Windows:
https://github.com/oschwartz10612/poppler-windows/releases/

### "Connection refused" (Redis)

Prüfe ob Redis läuft:
```bash
redis-cli ping
# Sollte "PONG" zurückgeben
```

### Worker startet nicht

Verwende `--pool=solo` auf Windows:
```bash
celery -A worker worker --loglevel=info --pool=solo
```

## Nächste Schritte

1. ✅ Worker läuft
2. ⏳ Next.js API-Routes erstellen (`/api/ocr/upload`, `/api/ocr/status`)
3. ⏳ Frontend UI für Upload und Progress
4. ⏳ Testing mit echten Dokumenten

## Support

Bei Problemen siehe Logs:
```bash
# Worker Logs zeigen alle Fehler
celery -A worker worker --loglevel=debug
```
