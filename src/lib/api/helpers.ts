/**
 * API Helper Functions
 * Gemeinsame Hilfsfunktionen für API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/auth';
import type { UserPayload, ApiResponse, ApiError } from '@/types';

const getSecret = () => getJwtSecret();

/**
 * Extrahiert und validiert den User aus dem JWT-Token
 */
export async function getUserFromToken(request: NextRequest): Promise<UserPayload | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as UserPayload;
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return null;
  }
}

/**
 * Hilfsfunktion für konsistente Error-Responses
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 500
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      statusCode,
    },
    { status: statusCode }
  );
}

/**
 * Hilfsfunktion für konsistente Success-Responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status: statusCode }
  );
}

/**
 * Prüft ob der User authentifiziert ist
 * Gibt Error-Response zurück wenn nicht authentifiziert
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: UserPayload } | { error: NextResponse }> {
  const user = await getUserFromToken(request);

  if (!user) {
    return { error: createErrorResponse('Nicht authentifiziert', 401) };
  }

  return { user };
}

/**
 * Prüft ob der User Admin ist
 * Gibt Error-Response zurück wenn nicht autorisiert
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: UserPayload } | { error: NextResponse }> {
  const authResult = await requireAuth(request);

  if ('error' in authResult) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return {
      error: createErrorResponse(
        'Keine Berechtigung. Diese Aktion erfordert Administrator-Rechte.',
        403
      ),
    };
  }

  return authResult;
}

/**
 * Hilfsfunktion für Database Error Handling
 */
export function handleDatabaseError(error: unknown, context: string): NextResponse {
  console.error(`❌ Database Error in ${context}:`, error);

  if (error instanceof Error) {
    // Foreign Key Constraint Violation
    if (error.message.includes('violates foreign key constraint')) {
      return createErrorResponse(
        'Ein oder mehrere referenzierte Datensätze existieren nicht.',
        400
      );
    }

    // Unique Constraint Violation
    if (error.message.includes('violates unique constraint')) {
      return createErrorResponse('Ein Eintrag mit diesen Daten existiert bereits.', 400);
    }

    // Not Null Constraint Violation
    if (error.message.includes('violates not-null constraint')) {
      return createErrorResponse('Ein Pflichtfeld wurde nicht ausgefüllt.', 400);
    }
  }

  return createErrorResponse(
    `Fehler bei ${context}. Bitte versuchen Sie es später erneut.`,
    500
  );
}

/**
 * Validiert Pflichtfelder
 * Gibt Error-Response zurück wenn Felder fehlen
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: Array<{ key: string; label: string }>
): { valid: true } | { valid: false; error: NextResponse } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!data[field.key]) {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: createErrorResponse(
        `Folgende Pflichtfelder fehlen: ${missingFields.join(', ')}`,
        400
      ),
    };
  }

  return { valid: true };
}
