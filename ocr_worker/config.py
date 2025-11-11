"""
OCR Worker Configuration
Celery und Database Settings
"""

import os
from celery import Celery
from dotenv import load_dotenv

# .env Datei laden
load_dotenv()

# Redis Connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# PostgreSQL Connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:Manisali45!*@localhost:5432/abfertigung')

# Celery App Setup
celery_app = Celery(
    'ocr_worker',
    broker=REDIS_URL,
    backend=REDIS_URL
)

# Celery Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Berlin',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 Minuten max
    worker_prefetch_multiplier=1,  # Ein Task pro Worker
    worker_max_tasks_per_child=50,  # Worker neu starten nach 50 Tasks
)

# PaddleOCR Settings
PADDLE_USE_GPU = False  # CPU-Modus (schneller Setup)
PADDLE_LANG = 'en'  # Englisch (für internationale Dokumente)
PADDLE_DET_DB_THRESH = 0.3  # Text Detection Threshold
PADDLE_REC_CONF_THRESH = 0.5  # Recognition Confidence Threshold

# File Upload Settings
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp'}

# Create upload folder if not exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
