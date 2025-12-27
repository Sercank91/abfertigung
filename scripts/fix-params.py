import os
import re

# Liste der zu korrigierenden Dateien
files_to_fix = [
    'src/app/api/guarantees/[id]/route.ts',
    'src/app/api/authorizations/[id]/route.ts',
    'src/app/api/goods-locations/[id]/route.ts',
    'src/app/api/users/[id]/route.ts',
    'src/app/api/employees/[id]/route.ts',
    'src/app/api/routes/[id]/route.ts',
    'src/app/api/clearances/[anmNr]/route.ts',
    'src/app/api/ocr/document/[documentId]/route.ts',
    'src/app/api/ocr/documents/[clearanceId]/route.ts',
    'src/app/api/ocr/shipments/[clearanceId]/route.ts',
    'src/app/api/ocr/status/[documentId]/route.ts',
]

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"Ueberspringe: {filepath} (nicht gefunden)")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = 0
    
    # Pattern 1: { params }: { params: { id: string } }
    pattern1 = r'\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}'
    replacement1 = r'context: { params: Promise<{\1}> }'
    
    if re.search(pattern1, content):
        content = re.sub(pattern1, replacement1, content)
        changes += 1
        
        # Füge "const params = await context.params;" nach der Funktionssignatur hinzu
        # Suche nach der Funktionssignatur und füge die Zeile ein
        pattern2 = r'(export async function (?:GET|POST|PUT|PATCH|DELETE)\([^)]+context: \{ params: Promise<[^>]+>\s*\}\s*\)\s*\{)'
        replacement2 = r'\1\n  const params = await context.params;'
        
        content = re.sub(pattern2, replacement2, content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"OK Korrigiert: {filepath}")
        return True
    else:
        print(f"INFO Keine Aenderung: {filepath}")
        return False

def main():
    print("Korrigiere params in API-Routes...\n")
    
    fixed = 0
    skipped = 0
    
    for filepath in files_to_fix:
        if fix_file(filepath):
            fixed += 1
        else:
            skipped += 1
    
    print(f"\nZusammenfassung:")
    print(f"   Korrigiert: {fixed}")
    print(f"   Uebersprungen: {skipped}")
    print(f"   Gesamt: {len(files_to_fix)}")

if __name__ == '__main__':
    main()

