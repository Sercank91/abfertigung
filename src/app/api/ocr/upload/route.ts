import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { querySystem } from '@/lib/db';
import logger from '@/lib/logger';

const execPromise = promisify(exec);

// Upload-Verzeichnis
const UPLOAD_DIR = path.join(process.cwd(), 'ocr_worker', 'uploads');

// Erlaubte Dateitypen
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'image/bmp',
];

// Max Dateigröße: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Sendet einen Task an Celery via Python-Skript
 */
async function sendCeleryTask(
  docId: string,
  filePath: string,
  clearanceId: string
): Promise<string> {
  // Python Virtual Environment und Skript-Pfad
  const workerDir = path.join(process.cwd(), 'ocr_worker');
  const pythonPath =
    process.platform === 'win32'
      ? path.join(workerDir, 'ocr_env', 'Scripts', 'python.exe')
      : path.join(workerDir, 'ocr_env', 'bin', 'python');
  const scriptPath = path.join(workerDir, 'send_task.py');

  try {
    // Python-Skript ausführen, das den Task sendet
    const { stdout, stderr } = await execPromise(
      `"${pythonPath}" "${scriptPath}" "${docId}" "${filePath}" "${clearanceId}"`,
      { cwd: workerDir }
    );

    if (stderr) {
      logger.error('Python stderr:', { stderr });
    }

    // Parsen des JSON-Outputs
    const result = JSON.parse(stdout.trim());

    if (!result.success) {
      throw new Error(result.error || 'Task-Sendung fehlgeschlagen');
    }

    return result.task_id;
  } catch (error) {
    logger.error('Fehler beim Senden des Tasks:', { error });
    throw error;
  }
}

/**
 * POST /api/ocr/upload
 *
 * Lädt eine PDF/Bild-Datei hoch und startet OCR-Verarbeitung
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clearanceId = formData.get('clearanceId') as string;

    // Validierung
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    if (!clearanceId) {
      return NextResponse.json(
        { error: 'clearanceId fehlt' },
        { status: 400 }
      );
    }

    // Dateityp prüfen
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Ungültiger Dateityp. Erlaubt: PDF, PNG, JPG, TIFF, BMP',
        },
        { status: 400 }
      );
    }

    // Dateigröße prüfen
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß. Maximum: 50 MB' },
        { status: 400 }
      );
    }

    // Upload-Verzeichnis erstellen falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Eindeutigen Dateinamen generieren
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);

    // Datei speichern
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    logger.info(`✅ Datei gespeichert: ${filePath}`);

    // OcrDocument in Datenbank erstellen
    const docId = uuidv4();
    const now = new Date();

    await querySystem(
      `INSERT INTO "OcrDocument" (
        id, "clearanceId", "fileName", "fileSize", "fileType",
        "filePath", status, progress, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        docId,
        clearanceId,
        file.name,
        file.size,
        file.type,
        filePath,
        'pending',
        0,
        now,
        now,
      ]
    );

    logger.info(`✅ OcrDocument erstellt: ${docId}`);

    // Celery Task senden via Python-Skript
    const taskId = await sendCeleryTask(docId, filePath, clearanceId);

    // Task-ID in Datenbank speichern
    await querySystem(
      'UPDATE "OcrDocument" SET "ocrJobId" = $1, "updatedAt" = $2 WHERE id = $3',
      [taskId, new Date(), docId]
    );

    logger.info(`✅ Celery Task gesendet: ${taskId}`);

    return NextResponse.json({
      success: true,
      documentId: docId,
      taskId,
      message: 'Datei hochgeladen. OCR-Verarbeitung gestartet.',
    });
  } catch (error) {
    logger.error('❌ Upload-Fehler:', { error });
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
