import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { pool } from '@/lib/db';

// Redis Client für Celery
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
});

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

interface CeleryTask {
  id: string;
  task: string;
  args: any[];
  kwargs: Record<string, any>;
  retries: number;
  eta: string | null;
  expires: string | null;
}

/**
 * Sendet einen Task an Celery via Redis
 */
async function sendCeleryTask(
  taskName: string,
  args: any[] = [],
  kwargs: Record<string, any> = {}
): Promise<string> {
  const taskId = uuidv4();

  // Celery Protocol v2 Message Format
  const body = [
    args,
    kwargs,
    {
      callbacks: null,
      errbacks: null,
      chain: null,
      chord: null,
    },
  ];

  const message = {
    body: Buffer.from(JSON.stringify(body)).toString('base64'),
    'content-encoding': 'utf-8',
    'content-type': 'application/json',
    headers: {
      lang: 'py',
      task: taskName,
      id: taskId,
      shadow: null,
      eta: null,
      expires: null,
      group: null,
      group_index: null,
      retries: 0,
      timelimit: [null, null],
      root_id: taskId,
      parent_id: null,
      argsrepr: JSON.stringify(args),
      kwargsrepr: JSON.stringify(kwargs),
      origin: 'nextjs',
    },
    properties: {
      correlation_id: taskId,
      reply_to: taskId,
      delivery_mode: 2,
      delivery_info: {
        exchange: '',
        routing_key: 'celery',
      },
      priority: 0,
      body_encoding: 'base64',
      delivery_tag: taskId,
    },
  };

  // An Redis senden (Celery Queue)
  await redis.lpush('celery', JSON.stringify(message));

  return taskId;
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

    console.log(`✅ Datei gespeichert: ${filePath}`);

    // OcrDocument in Datenbank erstellen
    const docId = uuidv4();
    const now = new Date();

    await pool.query(
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

    console.log(`✅ OcrDocument erstellt: ${docId}`);

    // Celery Task senden
    const taskId = await sendCeleryTask(
      'worker.process_ocr_document',
      [docId, filePath, clearanceId]
    );

    // Task-ID in Datenbank speichern
    await pool.query(
      `UPDATE "OcrDocument" SET "ocrJobId" = $1, "updatedAt" = $2 WHERE id = $3`,
      [taskId, new Date(), docId]
    );

    console.log(`✅ Celery Task gesendet: ${taskId}`);

    return NextResponse.json({
      success: true,
      documentId: docId,
      taskId,
      message: 'Datei hochgeladen. OCR-Verarbeitung gestartet.',
    });
  } catch (error) {
    console.error('❌ Upload-Fehler:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
