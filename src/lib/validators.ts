import { z } from 'zod'

/**
 * 🛡️ Zod Validierungs-Schemas für API-Endpoints
 *
 * Vorteile:
 * - Automatische Type-Safety
 * - Bessere Fehlermeldungen
 * - Schutz vor ungültigen Daten
 * - Selbst-dokumentierend
 */

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

/**
 * Login Request Schema
 *
 * Validiert Login-Daten bevor sie zur Datenbank gehen.
 */
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username ist erforderlich').max(100, 'Username zu lang'),
  password: z.string().min(1, 'Passwort ist erforderlich').max(200, 'Passwort zu lang'),
})

export type LoginInput = z.infer<typeof LoginSchema>

/**
 * Passwort-Änderung Schema
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
  newPassword: z
    .string()
    .min(6, 'Neues Passwort muss mindestens 6 Zeichen haben')
    .max(200, 'Passwort zu lang'),
})

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

// =============================================================================
// CLEARANCE SCHEMAS
// =============================================================================

/**
 * Clearance Erstellung Schema
 *
 * Validiert Abfertigungs-Daten.
 */
export const CreateClearanceSchema = z
  .object({
    lrn: z.string().min(1, 'LRN ist erforderlich').max(50, 'LRN zu lang'),

    companyId: z.string().uuid('Ungültige Firmen-ID'),

    guaranteeId: z.string().uuid('Ungültige Bürgschafts-ID'),

    licensePlate: z
      .string()
      .min(1, 'Kennzeichen ist erforderlich')
      .max(20, 'Kennzeichen zu lang')
      .transform((val) => val.toUpperCase()),

    licensePlateCountry: z
      .string()
      .length(2, 'Ländercode muss 2 Zeichen haben')
      .transform((val) => val.toUpperCase()),

    hasSecondPlate: z.boolean().optional().default(false),

    secondLicensePlate: z
      .string()
      .max(20)
      .optional()
      .nullable()
      .transform((val) => val?.toUpperCase() ?? null),

    secondPlateCountry: z
      .string()
      .length(2)
      .optional()
      .nullable()
      .transform((val) => val?.toUpperCase() ?? null),

    routeId: z.string().uuid().optional().nullable(),

    simplifiedProcedure: z.boolean().optional().default(false),

    goodsLocationId: z.string().uuid().optional().nullable(),

    authorizationId: z.string().uuid().optional().nullable(),

    departureOfficeId: z.string().uuid().optional().nullable(),

    dispatchOfficeId: z.string().uuid().optional().nullable(),

    destinationOfficeId: z.string().uuid().optional().nullable(),

    registrationDate: z.string().datetime().or(z.date()).optional(),

    arrivalDate: z.string().datetime().or(z.date()).optional(),
  })
  .refine(
    (data) => {
      // Wenn vereinfachtes Verfahren, dann müssen goodsLocationId und authorizationId vorhanden sein
      if (data.simplifiedProcedure) {
        return data.goodsLocationId && data.authorizationId
      }
      return true
    },
    {
      message: 'Bei vereinfachtem Verfahren sind Warenort und Bewilligung erforderlich',
      path: ['simplifiedProcedure'],
    }
  )

export type CreateClearanceInput = z.infer<typeof CreateClearanceSchema>

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

/**
 * Firma Erstellung Schema
 */
export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Firmenname ist erforderlich').max(200, 'Firmenname zu lang'),

  country: z.string().min(1, 'Land ist erforderlich').max(100, 'Land zu lang'),

  address: z.string().max(200).optional().default(''),

  postalCode: z.string().max(20).optional().default(''),

  city: z.string().max(100).optional().default(''),

  emails: z.array(z.string().email('Ungültige E-Mail-Adresse')).optional().default([]),

  phones: z.array(z.string()).optional().default([]),

  guaranteeIds: z
    .array(z.string().uuid('Ungültige Bürgschafts-ID'))
    .min(1, 'Mindestens eine Bürgschaft erforderlich'),
})

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>

// =============================================================================
// USER SCHEMAS
// =============================================================================

/**
 * User Erstellung Schema
 */
export const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username muss mindestens 3 Zeichen haben')
    .max(50, 'Username zu lang')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username darf nur Buchstaben, Zahlen, - und _ enthalten'),

  email: z.string().email('Ungültige E-Mail-Adresse').optional().nullable(),

  password: z
    .string()
    .min(6, 'Passwort muss mindestens 6 Zeichen haben')
    .max(200, 'Passwort zu lang'),

  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100, 'Vorname zu lang'),

  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100, 'Nachname zu lang'),

  phone: z.string().max(50).optional().nullable(),

  role: z
    .enum(['admin', 'schichtleiter', 'mitarbeiter'], {
      errorMap: () => ({ message: 'Ungültige Rolle. Erlaubt: admin, schichtleiter, mitarbeiter' }),
    })
    .default('mitarbeiter'),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Hilfsfunktion: Validiere Daten mit besserem Error-Handling
 *
 * @param schema - Zod Schema
 * @param data - Zu validierende Daten
 * @returns Validierte Daten
 * @throws Error mit verständlicher Fehlermeldung
 *
 * @example
 * ```typescript
 * const validData = validateData(LoginSchema, requestBody);
 * ```
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    // Erstelle verständliche Fehlermeldung
    const errors = result.error.errors.map((err) => {
      const path = err.path.join('.')
      return `${path}: ${err.message}`
    })

    throw new Error(`Validierungsfehler: ${errors.join(', ')}`)
  }

  return result.data
}

/**
 * Hilfsfunktion: Validiere mit detailliertem Error-Objekt
 *
 * @param schema - Zod Schema
 * @param data - Zu validierende Daten
 * @returns { success: true, data } oder { success: false, errors }
 *
 * @example
 * ```typescript
 * const result = safeValidate(LoginSchema, requestBody);
 * if (!result.success) {
 *   return NextResponse.json({ errors: result.errors }, { status: 400 });
 * }
 * const { username, password } = result.data;
 * ```
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string> = {}

    result.error.errors.forEach((err) => {
      const path = err.path.join('.') || 'general'
      errors[path] = err.message
    })

    return { success: false, errors }
  }

  return { success: true, data: result.data }
}
