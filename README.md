# 🚛 Abfertigung - Zollabfertigungs-Management System

Multi-Tenant SaaS-Anwendung für das Management von Zollabfertigungen im internationalen Transportwesen.

## 📋 Features

### 🔐 Authentifizierung & Sicherheit
- Multi-Tenant Architektur (Subdomain-basiert)
- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle (Admin, Schichtleiter, Mitarbeiter)
- Sichere Passwort-Hashing mit bcrypt

### 📦 Abfertigungs-Management
- Automatische Anmeldenummern-Generierung (JJNNN Format)
- LRN-basiertes Tracking
- Zollstellen-Management
- Routen-Verwaltung
- Garantie/Bürgschafts-Verwaltung
- Warenlager-Verwaltung

### 🏢 Firmen-Management
- Transportunternehmen-Verwaltung
- Mitarbeiter-Verwaltung
- Mandantenfähigkeit

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Auth**: JWT (jose)
- **Styling**: Tailwind CSS
- **Validierung**: Zod
- **Code-Qualität**: ESLint, Prettier

## 🚀 Setup

### Voraussetzungen

```bash
Node.js >= 18
PostgreSQL >= 14
```

### Installation

1. **Repository klonen**
```bash
git clone https://github.com/Sercank91/abfertigung.git
cd abfertigung
```

2. **Dependencies installieren**
```bash
npm install
```

3. **Environment Variables einrichten**

Erstellen Sie eine `.env` Datei im Root-Verzeichnis:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/abfertigung"

# JWT Secret (generieren Sie einen sicheren Schlüssel!)
JWT_SECRET="ihr-super-geheimer-256-bit-schluessel"

# Environment
NODE_ENV="development"
```

4. **Datenbank migrieren**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Datenbank befüllen (optional)**
```bash
npm run seed:anmnr
```

6. **Development-Server starten**
```bash
npm run dev
```

App läuft auf: `http://localhost:3000`

## 📜 Verfügbare Scripts

```bash
npm run dev          # Development-Server starten
npm run build        # Production-Build erstellen
npm run start        # Production-Server starten
npm run lint         # Code auf Fehler prüfen
npm run lint -- --fix # Automatisch Probleme beheben
```

## 🏗️ Code-Qualitäts-Verbesserungen

Dieses Projekt wurde kürzlich mit folgenden Verbesserungen optimiert:

### 1. ✅ Zentrale Authentifizierung
- **Datei**: `src/lib/api-auth.ts`
- **Vorher**: getUserFromToken() in jeder Route dupliziert
- **Nachher**: Zentrale, wiederverwendbare Funktion
- **Vorteile**:
  - Keine Code-Duplikation
  - Einfacher zu warten
  - Hilfsfunktionen: `requireAuth()`, `hasRole()`, `requireRole()`

### 2. ✅ Input-Validierung mit Zod
- **Datei**: `src/lib/validators.ts`
- **Schemas für**: Login, Clearance, Company, User, etc.
- **Vorteile**:
  - Automatische Type-Safety
  - Schutz vor ungültigen Daten
  - Bessere Fehlermeldungen
  - Input-Sanitierung (z.B. toUpperCase())

### 3. ✅ Strukturiertes Logging
- **Datei**: `src/lib/logger.ts`
- **Features**:
  - Log-Levels: debug, info, warn, error
  - Farbige Ausgabe in Development
  - JSON-Format in Production
  - Spezial-Logger: auth, api, db
- **Vorteile**:
  - Besseres Debugging
  - Strukturierte Daten
  - Production-ready

### 4. ✅ Zentrales Error-Handling
- **Datei**: `src/lib/errors.ts`
- **Custom Error-Klassen**:
  - `BadRequestError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `ValidationError` (422)
  - `InternalServerError` (500)
- **API-Wrapper**: `handleApiError()` - Keine try-catch mehr nötig!
- **Vorteile**:
  - Konsistente Fehlerbehandlung
  - Weniger Code
  - Automatisches Logging

### 5. ✅ ESLint & Prettier Konfiguration
- **ESLint**: Code-Qualität prüfen
- **Prettier**: Automatische Code-Formatierung
- **EditorConfig**: Konsistente Editor-Einstellungen
- **Vorteile**:
  - Findet Fehler bevor sie Probleme machen
  - Konsistenter Code-Style
  - Funktioniert in jedem Editor

## 📁 Projekt-Struktur

```
abfertigung/
├── prisma/
│   ├── schema.prisma          # Datenbank-Schema
│   ├── seed.ts                # Seed-Daten
│   └── seed-anmnr.ts          # AnmNr-Sequenz initialisieren
├── src/
│   ├── app/
│   │   ├── api/               # API-Routes
│   │   │   ├── auth/          # Authentifizierung
│   │   │   ├── login/         # Login-Endpoint
│   │   │   ├── clearances/    # Abfertigungen
│   │   │   ├── companies/     # Firmen
│   │   │   ├── users/         # User-Verwaltung
│   │   │   └── ...
│   │   ├── dashboard/         # Dashboard-Seiten
│   │   └── page.tsx           # Landing Page
│   ├── components/            # React-Komponenten
│   ├── lib/                   # Utility-Funktionen
│   │   ├── api-auth.ts        # ✅ Zentrale Auth
│   │   ├── validators.ts      # ✅ Zod-Schemas
│   │   ├── logger.ts          # ✅ Logging-System
│   │   ├── errors.ts          # ✅ Error-Handling
│   │   ├── anmnr.ts           # AnmNr-Generierung
│   │   ├── auth.ts            # JWT-Funktionen
│   │   ├── db.ts              # PostgreSQL Pool
│   │   ├── prisma.ts          # Prisma Client
│   │   └── password.ts        # Passwort-Hashing
│   └── middleware.ts          # Next.js Middleware
├── .eslintrc.json             # ✅ ESLint Config
├── .prettierrc                # ✅ Prettier Config
├── .editorconfig              # ✅ Editor Config
└── package.json
```

## 🎯 Architektur-Übersicht

### Multi-Tenant Setup

```
Subdomain-basiertes Routing:
├── verag.abfertigung.io     → Tenant: Verag
├── mustafa.abfertigung.io   → Tenant: Mustafa
└── localhost:3000           → Landing Page
```

### Datenbank-Schema

- **Tenant**: Firmen/Mandanten
- **User**: Benutzer (rollenbasiert)
- **Clearance**: Abfertigungen mit automatischer AnmNr
- **Company**: Transportunternehmen
- **Guarantee**: Bürgschaften
- **Route**: Routen mit Transitstellen
- **CustomsOffice**: Zollstellen
- **GoodsLocation**: Warenlagerorte
- **Authorization**: Bewilligungen

### Authentifizierung-Flow

```
1. User besucht Subdomain (z.B. verag.localhost:3000)
2. Middleware prüft Subdomain → Tenant
3. Login mit Username + Passwort
4. JWT Token wird erstellt
5. Token in HttpOnly Cookie gespeichert
6. Alle API-Requests nutzen getUserFromToken()
```

### API-Route Beispiel (NEU mit allen Verbesserungen)

```typescript
import { handleApiError, UnauthorizedError } from '@/lib/errors'
import { getUserFromToken } from '@/lib/api-auth'
import { CreateUserSchema, validateData } from '@/lib/validators'
import logger from '@/lib/logger'

export const POST = handleApiError(async (request) => {
  // ✅ Auth prüfen
  const user = await getUserFromToken(request)
  if (!user) throw new UnauthorizedError()

  // ✅ Input validieren
  const body = await request.json()
  const data = validateData(CreateUserSchema, body)

  // ✅ Business Logic
  const newUser = await createUser(data)

  // ✅ Logging
  logger.info('User erstellt', { userId: newUser.id })

  return NextResponse.json(newUser)
})
// ✅ Error-Handling automatisch durch handleApiError()!
```

## 🔒 Sicherheits-Features

- ✅ JWT mit Ablauf-Zeit (24h)
- ✅ HttpOnly Cookies (kein JavaScript-Zugriff)
- ✅ CSRF-Protection (SameSite)
- ✅ Bcrypt Password-Hashing
- ✅ SQL-Injection-Schutz (Prisma/Parameterized Queries)
- ✅ Input-Validierung mit Zod
- ✅ JWT_SECRET Environment-Variable Validierung
- ✅ Multi-Tenant Isolation

## 📊 AnmNr-System

Automatische Generierung von Anmeldenummern:
- **Format**: `JJNNN` (z.B. `25001`, `25002`, ...)
- **JJ**: Jahr (2-stellig)
- **NNN**: Fortlaufende Nummer (3-stellig, padded)
- **Features**:
  - Transaction-basiert (keine Duplikate)
  - Row-Level Locking
  - Automatischer Jahreswechsel
  - Thread-safe

## 🤝 Contributing

Dieses Projekt wurde optimiert mit Best Practices für:
- Code-Qualität (ESLint)
- Code-Formatierung (Prettier)
- Type-Safety (TypeScript + Zod)
- Error-Handling
- Logging
- Sicherheit

Bei Änderungen bitte:
1. `npm run lint` ausführen
2. Alle Tests prüfen
3. Code-Style einhalten

## 📝 License

Privates Projekt - Alle Rechte vorbehalten

## 👨‍💻 Autor

Entwickelt für professionelles Zollabfertigungs-Management

---

## 📚 Weitere Dokumentation

- [Prisma Schema](./prisma/schema.prisma)
- [API Auth Docs](./src/lib/api-auth.ts)
- [Validators](./src/lib/validators.ts)
- [Logger](./src/lib/logger.ts)
- [Error Handling](./src/lib/errors.ts)

---

**Status**: ✅ Production-Ready mit professioneller Code-Qualität
