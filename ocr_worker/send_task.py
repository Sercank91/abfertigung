#!/usr/bin/env python
"""
Hilfsskript zum Senden von Celery Tasks
Wird von Next.js aufgerufen
"""

import sys
import json
import os
from dotenv import load_dotenv

# .env Datei laden
load_dotenv()

from worker import process_ocr_document

def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            'success': False,
            'error': 'Usage: send_task.py <doc_id> <file_path> <clearance_id>'
        }))
        sys.exit(1)

    doc_id = sys.argv[1]
    file_path = sys.argv[2]
    clearance_id = sys.argv[3]

    try:
        # Task asynchron senden
        result = process_ocr_document.delay(doc_id, file_path, clearance_id)

        print(json.dumps({
            'success': True,
            'task_id': result.id
        }))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
