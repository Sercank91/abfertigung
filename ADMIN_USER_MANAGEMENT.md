# Super-Admin: Benutzerverwaltung pro Tenant

## Übersicht

Super-Admins können jetzt Benutzer für jeden Tenant erstellen und verwalten. Die erstellten Benutzer können sich dann bei ihrem jeweiligen Tenant anmelden.

## Zugriff

### Navigation

1. **Admin-Portal öffnen**: `http://admin.localhost:3000`
2. **Zu Tenant-Daten**: Dashboard → Tenant-Verwaltung → "Daten" Button
3. **Zu Benutzerverwaltung**: Klicke auf die "User" Card (mit "→ Verwalten")

**Direkter Link**: `http://admin.localhost:3000/admin/tenant-data/[tenantId]/users`

## Funktionen

### 1. Benutzer-Liste anzeigen

Zeigt alle Benutzer des Tenants:
- Username
- Name (Vor- und Nachname)
- Email
- Rolle (Admin, Schichtleiter, Mitarbeiter)
- Status (Aktiv/Inaktiv)

### 2. Neuen Benutzer erstellen

**Button**: "Neuer Benutzer" (oben rechts)

**Pflichtfelder**:
- Username * (eindeutig pro Tenant)
- Vorname *
- Nachname *
- Passwort * (mindestens 8 Zeichen)
- Rolle *

**Optionale Felder**:
- Email
- Telefon

**Verfügbare Rollen**:
- **Admin**: Vollzugriff auf alle Funktionen des Tenants
- **Schichtleiter**: Kann Abfertigungen verwalten und Mitarbeiter sehen
- **Mitarbeiter**: Kann Abfertigungen erstellen und bearbeiten

### 3. Benutzer aktivieren/deaktivieren

**Button**: "Deaktivieren" / "Aktivieren"

- Deaktivierte Benutzer können sich nicht mehr anmelden
- Daten bleiben erhalten
- Kann jederzeit reaktiviert werden

## API-Endpunkte

### GET /api/admin/tenant-data/[tenantId]/users
Liste aller Benutzer eines Tenants

**Response**:
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "test",
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User",
      "phone": "+41 12 345 67 89",
      "role": "mitarbeiter",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/tenant-data/[tenantId]/users
Neuen Benutzer erstellen

**Request Body**:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123!",
  "firstName": "Test",
  "lastName": "User",
  "phone": "+41 12 345 67 89",
  "role": "mitarbeiter"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+41 12 345 67 89",
    "role": "mitarbeiter",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### PATCH /api/admin/tenant-data/[tenantId]/users/[id]
Benutzer aktualisieren

**Request Body** (alle Felder optional):
```json
{
  "email": "newemail@example.com",
  "firstName": "Neuer",
  "lastName": "Name",
  "phone": "+41 98 765 43 21",
  "role": "admin",
  "isActive": false,
  "password": "NewPassword123!"
}
```

### DELETE /api/admin/tenant-data/[tenantId]/users/[id]
Benutzer deaktivieren (Soft-Delete)

**Response**:
```json
{
  "success": true,
  "message": "User wurde deaktiviert"
}
```

## Benutzer-Login

Nach dem Erstellen kann sich der Benutzer bei seinem Tenant anmelden:

**Beispiel**:
- Tenant: Verag Spedition GmbH (Domain: `verag`)
- Username: `testuser`
- Passwort: `SecurePass123!`

**Login-URL**: `http://verag.localhost:3000`

1. Öffne `http://verag.localhost:3000`
2. Gib Username und Passwort ein
3. Klicke auf "Anmelden"
4. → Weiterleitung zum Dashboard

## Rollen und Berechtigungen

### Admin
- ✅ Vollzugriff auf alle Funktionen
- ✅ Kann Benutzer verwalten
- ✅ Kann Firmen, Bürgschaften, Routen verwalten
- ✅ Kann Abfertigungen erstellen, bearbeiten, löschen
- ✅ Kann Einstellungen ändern

### Schichtleiter
- ✅ Kann Abfertigungen verwalten
- ✅ Kann Mitarbeiter sehen
- ✅ Kann Firmen, Bürgschaften, Routen sehen
- ❌ Kann keine Benutzer verwalten
- ❌ Kann keine Einstellungen ändern

### Mitarbeiter
- ✅ Kann Abfertigungen erstellen und bearbeiten
- ✅ Kann Firmen, Bürgschaften, Routen sehen
- ❌ Kann keine Benutzer verwalten
- ❌ Kann keine Einstellungen ändern

## Sicherheit

### Passwort-Anforderungen
- Mindestens 8 Zeichen
- Wird mit bcrypt gehasht (10 Rounds)
- Wird nie im Klartext gespeichert

### Username-Validierung
- Eindeutig pro Tenant (nicht global)
- Nur Buchstaben, Zahlen, Punkt, Unterstrich, Bindestrich
- Mindestens 3 Zeichen
- Maximal 30 Zeichen

### Tenant-Isolation
- Benutzer können nur bei ihrem eigenen Tenant anmelden
- Super-Admin kann Benutzer für alle Tenants verwalten
- Cross-Tenant-Zugriff ist blockiert

## Beispiel-Workflow

### Neuen Tenant mit Benutzer einrichten

1. **Tenant erstellen**:
   - Admin-Portal → Tenant-Verwaltung → "Neuer Tenant"
   - Name: "Test Spedition AG"
   - Domain: "test"
   - Erstellen

2. **Admin-Benutzer erstellen**:
   - Tenant-Daten → User Card → "→ Verwalten"
   - "Neuer Benutzer" klicken
   - Username: `admin`
   - Vorname: `Test`
   - Nachname: `Admin`
   - Email: `admin@test.ch`
   - Passwort: `Admin123!`
   - Rolle: `Admin`
   - Erstellen

3. **Mitarbeiter erstellen**:
   - "Neuer Benutzer" klicken
   - Username: `mitarbeiter1`
   - Vorname: `Max`
   - Nachname: `Mustermann`
   - Passwort: `Mitarbeiter123!`
   - Rolle: `Mitarbeiter`
   - Erstellen

4. **Login testen**:
   - Öffne `http://test.localhost:3000`
   - Login mit `admin` / `Admin123!`
   - → Dashboard sollte erscheinen

## Neue Dateien

1. `src/app/api/admin/tenant-data/[tenantId]/users/route.ts` - User List & Create API
2. `src/app/api/admin/tenant-data/[tenantId]/users/[id]/route.ts` - User Update & Delete API
3. `src/app/admin/tenant-data/[tenantId]/users/page.tsx` - Benutzerverwaltungs-Seite

## Geänderte Dateien

1. `src/app/admin/tenant-data/[tenantId]/page.tsx` - Link zur Benutzerverwaltung hinzugefügt

## Testing

```powershell
# 1. Admin-Portal öffnen
# http://admin.localhost:3000

# 2. Zu Tenant-Daten navigieren
# Dashboard → Tenant-Verwaltung → Verag → "Daten"

# 3. Zu Benutzerverwaltung
# Klicke auf "User" Card

# 4. Neuen Benutzer erstellen
# "Neuer Benutzer" → Formular ausfüllen → "Erstellen"

# 5. Login testen
# http://verag.localhost:3000
# Login mit neuem Benutzer
```

## Troubleshooting

### "Benutzername existiert bereits"
- Username muss pro Tenant eindeutig sein
- Wähle einen anderen Username

### "Passwort muss mindestens 8 Zeichen haben"
- Verwende ein längeres Passwort
- Empfohlen: Mindestens 12 Zeichen mit Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen

### Benutzer kann sich nicht anmelden
1. Prüfe ob Benutzer aktiv ist (Status: "Aktiv")
2. Prüfe ob Tenant aktiv ist
3. Prüfe ob richtige Domain verwendet wird (z.B. `verag.localhost:3000`)
4. Prüfe Username und Passwort (Case-sensitive!)

### "Nicht autorisiert" Fehler
- Stelle sicher, dass du als Super-Admin angemeldet bist
- Cookie `admin-token` muss vorhanden sein
- Ggf. neu anmelden

## Zusammenfassung

✅ Super-Admin kann Benutzer für jeden Tenant erstellen
✅ 3 Rollen verfügbar: Admin, Schichtleiter, Mitarbeiter
✅ Benutzer können sich bei ihrem Tenant anmelden
✅ Aktivieren/Deaktivieren von Benutzern
✅ Passwort-Sicherheit mit bcrypt
✅ Tenant-Isolation gewährleistet

