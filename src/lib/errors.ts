import { NextResponse } from 'next/server'
import logger from './logger'

/**
 * 🚨 Zentrale Error-Handling System
 *
 * Vorteile:
 * - Einheitliche Fehlerbehandlung in allen API-Routes
 * - Custom Error-Klassen für verschiedene Fehlertypen
 * - Automatisches Logging
 * - Konsistente HTTP-Status-Codes
 * - Bessere Fehlermeldungen für Endnutzer
 */

/**
 * Basis-Klasse für alle API-Fehler
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 - Bad Request
 * Für ungültige Input-Daten
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Ungültige Anfrage', context?: Record<string, any>) {
    super(message, 400, true, context)
  }
}

/**
 * 401 - Unauthorized
 * Für fehlende oder ungültige Authentifizierung
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Nicht authentifiziert', context?: Record<string, any>) {
    super(message, 401, true, context)
  }
}

/**
 * 403 - Forbidden
 * Für fehlende Berechtigungen
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Keine Berechtigung', context?: Record<string, any>) {
    super(message, 403, true, context)
  }
}

/**
 * 404 - Not Found
 * Für nicht gefundene Ressourcen
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Nicht gefunden', context?: Record<string, any>) {
    super(message, 404, true, context)
  }
}

/**
 * 409 - Conflict
 * Für Konflikte (z.B. Duplikate)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Konflikt', context?: Record<string, any>) {
    super(message, 409, true, context)
  }
}

/**
 * 422 - Unprocessable Entity
 * Für Validierungsfehler
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validierungsfehler', context?: Record<string, any>) {
    super(message, 422, true, context)
  }
}

/**
 * 500 - Internal Server Error
 * Für unerwartete Fehler
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Interner Serverfehler', context?: Record<string, any>) {
    super(message, 500, false, context)
  }
}

/**
 * 🛡️ Konvertiert Error zu NextResponse
 *
 * Diese Funktion wird von handleApiError verwendet.
 */
export function errorToResponse(error: Error | AppError): NextResponse {
  // AppError → Bekannter Fehler mit spezifischem Status-Code
  if (error instanceof AppError) {
    const response = {
      error: error.message,
      ...(error.context && process.env.NODE_ENV !== 'production' ? { context: error.context } : {}),
    }

    // Logging basierend auf Schwere
    if (error.statusCode >= 500) {
      logger.error(error.message, {
        statusCode: error.statusCode,
        ...error.context,
        stack: error.stack,
      })
    } else if (error.statusCode >= 400) {
      logger.warn(error.message, {
        statusCode: error.statusCode,
        ...error.context,
      })
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Zod Validation Error
  if (error.message?.includes('Validierungsfehler')) {
    logger.warn('Validierungsfehler', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Unbekannter Fehler → 500 Internal Server Error
  logger.error('Unerwarteter Fehler', {
    error: error.message,
    stack: error.stack,
  })

  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === 'production'
          ? 'Ein unerwarteter Fehler ist aufgetreten'
          : error.message,
    },
    { status: 500 }
  )
}

/**
 * 🎯 API-Route Handler Wrapper
 *
 * Wrapped eine API-Route-Funktion und behandelt automatisch alle Fehler.
 *
 * @example
 * ```typescript
 * export const POST = handleApiError(async (request) => {
 *   const user = await getUserFromToken(request);
 *   if (!user) throw new UnauthorizedError();
 *
 *   const data = await request.json();
 *   // ... Business Logic ...
 *
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function handleApiError<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof Error) {
        return errorToResponse(error)
      }

      // Völlig unbekannter Fehler (kein Error-Objekt)
      logger.error('Nicht-Error-Objekt geworfen', { error: String(error) })
      return NextResponse.json(
        { error: 'Ein unerwarteter Fehler ist aufgetreten' },
        { status: 500 }
      )
    }
  }
}

/**
 * 🔒 Hilfsfunktion: Wirft Fehler wenn User nicht eingeloggt
 *
 * @example
 * ```typescript
 * const user = await getUserFromToken(request);
 * ensureAuthenticated(user); // Wirft UnauthorizedError wenn null
 * // Ab hier ist user garantiert nicht null
 * ```
 */
export function ensureAuthenticated<T>(user: T | null): asserts user is T {
  if (!user) {
    throw new UnauthorizedError('Sie müssen eingeloggt sein')
  }
}

/**
 * 🔒 Hilfsfunktion: Wirft Fehler wenn User nicht die erforderliche Rolle hat
 *
 * @example
 * ```typescript
 * ensureRole(user, ['admin', 'schichtleiter']);
 * // Wirft ForbiddenError wenn user.role nicht 'admin' oder 'schichtleiter' ist
 * ```
 */
export function ensureRole(user: { role: string }, allowedRoles: string[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Diese Aktion erfordert eine der folgenden Rollen: ${allowedRoles.join(', ')}`
    )
  }
}

/**
 * 🔍 Hilfsfunktion: Wirft NotFoundError wenn Ressource nicht gefunden
 *
 * @example
 * ```typescript
 * const result = await db.query(...);
 * ensureFound(result.rows[0], 'User');
 * // Wirft NotFoundError('User nicht gefunden') wenn undefined
 * ```
 */
export function ensureFound<T>(
  item: T | null | undefined,
  resourceName: string
): asserts item is T {
  if (!item) {
    throw new NotFoundError(`${resourceName} nicht gefunden`)
  }
}
