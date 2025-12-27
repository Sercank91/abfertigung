import { queryTenant } from './db';

/**
 * 🏆 PROFESSIONELLE Tenant-Scoped AnmNr-Generierung
 * 
 * ✅ Atomic UPSERT mit RETURNING
 * ✅ Verhindert Race Conditions durch Postgres-interne Locks
 * ✅ Tenant-Isolation (jeder Tenant hat eigene Sequenzen)
 * ✅ Automatischer Jahreswechsel
 * 
 * Format: JJNNN (z.B. 25001, 25002, 25003, ...)
 * 
 * @param tenantId - Die Tenant-ID aus user.tenantId
 * @returns Formatierte AnmNr (5 Ziffern)
 */
export async function generateNextAnmNr(tenantId: string): Promise<string> {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('tenantId ist erforderlich für AnmNr-Generierung');
  }
  
  const currentYear = new Date().getFullYear();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    console.log(`🎯 Generiere AnmNr für Tenant ${tenantId}, Jahr ${currentYear}...`);
  }
  
  try {
    // ✅ Atomic UPSERT: Insert oder Update in einer Query
    // ON CONFLICT garantiert atomare Operation ohne explizite Transaction
    const result = await queryTenant<{ letzteNummer: number }>(
      tenantId,
      `INSERT INTO "AnmNrSequence" ("tenantId", jahr, "letzteNummer", "createdAt", "updatedAt")
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT ("tenantId", jahr)
       DO UPDATE SET 
         "letzteNummer" = "AnmNrSequence"."letzteNummer" + 1,
         "updatedAt" = NOW()
       RETURNING "letzteNummer"`,
      [tenantId, currentYear]
    );
    
    const neueNummer = result.rows[0].letzteNummer;
    
    // ✅ Formatiere AnmNr: JJNNN
    const yearShort = currentYear.toString().slice(-2);
    const anmNr = `${yearShort}${neueNummer.toString().padStart(3, '0')}`;
    
    if (!isProduction) {
      console.log(`✅ AnmNr erfolgreich generiert: ${anmNr} (Nummer ${neueNummer}/${currentYear})`);
    }
    
    return anmNr;
    
  } catch (error) {
    console.error('❌ Fehler bei AnmNr-Generierung:', error);
    throw new Error('Konnte keine Anmeldenummer generieren');
  }
}

/**
 * Formatiert AnmNr für UI-Anzeige
 * 
 * @example
 * formatAnmNr("25055") // → "25.055"
 * formatAnmNr("25001") // → "25.001"
 */
export function formatAnmNr(anmNr: string): string {
  if (!anmNr || anmNr.length !== 5) return anmNr;
  return `${anmNr.slice(0, 2)}.${anmNr.slice(2)}`;
}

/**
 * Validiert AnmNr Format
 * 
 * @example
 * isValidAnmNr("25055") // → true
 * isValidAnmNr("25.055") // → false (mit Punkt!)
 * isValidAnmNr("2505") // → false (zu kurz)
 * isValidAnmNr("abc12") // → false (keine Ziffern)
 */
export function isValidAnmNr(anmNr: string): boolean {
  if (!anmNr) return false;
  
  // Format: JJNNN (5 Zeichen, alle Ziffern)
  const regex = /^\d{5}$/;
  return regex.test(anmNr);
}

/**
 * 🔧 Utility: Hole aktuelle Sequenz-Info (für Debugging)
 * 
 * @param tenantId - Die Tenant-ID
 */
export async function getCurrentSequenceInfo(tenantId: string): Promise<{
  jahr: number;
  letzteNummer: number;
  naechsteAnmNr: string;
}> {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('tenantId ist erforderlich');
  }
  
  try {
    const currentYear = new Date().getFullYear();
    
    const result = await queryTenant<{ letzteNummer: number }>(
      tenantId,
      'SELECT "letzteNummer" FROM "AnmNrSequence" WHERE "tenantId" = $1 AND jahr = $2',
      [tenantId, currentYear]
    );
    
    if (result.rows.length === 0) {
      return {
        jahr: currentYear,
        letzteNummer: 0,
        naechsteAnmNr: `${currentYear.toString().slice(-2)}001`
      };
    }
    
    const letzteNummer = result.rows[0].letzteNummer;
    const yearShort = currentYear.toString().slice(-2);
    const naechsteNummer = letzteNummer + 1;
    const naechsteAnmNr = `${yearShort}${naechsteNummer.toString().padStart(3, '0')}`;
    
    return {
      jahr: currentYear,
      letzteNummer,
      naechsteAnmNr
    };
  } catch (error) {
    console.error('Fehler beim Abrufen der Sequenz-Info:', error);
    throw error;
  }
}