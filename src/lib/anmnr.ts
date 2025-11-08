import { pool } from './db';

/**
 * 🏆 PROFESSIONELLE AnmNr-Generierung
 * 
 * ✅ Transaction mit SERIALIZABLE Isolation Level
 * ✅ Row-Level Locking (FOR UPDATE)
 * ✅ Verhindert Race Conditions
 * ✅ Skaliert auf mehrere Speditionen gleichzeitig
 * ✅ Automatischer Jahreswechsel
 * 
 * Format: JJNNN (z.B. 25001, 25002, 25003, ...)
 */
export async function generateNextAnmNr(): Promise<string> {
  const client = await pool.connect();
  
  try {
    // ✅ Start Transaction mit höchstem Isolation Level
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    
    const currentYear = new Date().getFullYear();
    
    console.log(`🎯 Generiere AnmNr für Jahr ${currentYear}...`);
    
    // ✅ Hole Sequenz-Eintrag MIT ROW LOCK
    // FOR UPDATE = Keine andere Transaction kann diese Zeile gleichzeitig lesen/ändern
    let result = await client.query(
      `SELECT "letzteNummer" 
       FROM "AnmNrSequence" 
       WHERE jahr = $1 
       FOR UPDATE`,
      [currentYear]
    );
    
    let letzteNummer: number;
    
    if (result.rows.length === 0) {
      // ✅ Neues Jahr - erstelle Eintrag
      console.log(`📅 Neues Jahr ${currentYear} - erstelle Sequenz-Eintrag`);
      
      await client.query(
        `INSERT INTO "AnmNrSequence" (jahr, "letzteNummer", "createdAt", "updatedAt") 
         VALUES ($1, 0, NOW(), NOW())`,
        [currentYear]
      );
      
      letzteNummer = 0;
    } else {
      letzteNummer = result.rows[0].letzteNummer;
      console.log(`📊 Aktuelle Nummer: ${letzteNummer}`);
    }
    
    // ✅ Erhöhe Nummer
    const neueNummer = letzteNummer + 1;
    
    // ✅ Update Sequenz (die Zeile ist noch gesperrt!)
    await client.query(
      `UPDATE "AnmNrSequence" 
       SET "letzteNummer" = $1, "updatedAt" = NOW() 
       WHERE jahr = $2`,
      [neueNummer, currentYear]
    );
    
    // ✅ Formatiere AnmNr: JJNNN
    const yearShort = currentYear.toString().slice(-2);
    const anmNr = `${yearShort}${neueNummer.toString().padStart(3, '0')}`;
    
    // ✅ Commit Transaction
    await client.query('COMMIT');
    
    console.log(`✅ AnmNr erfolgreich generiert: ${anmNr} (Nummer ${neueNummer}/${currentYear})`);
    
    return anmNr;
    
  } catch (error) {
    // ❌ Fehler - Rollback!
    await client.query('ROLLBACK');
    console.error('❌ Fehler bei AnmNr-Generierung:', error);
    throw new Error('Konnte keine Anmeldenummer generieren');
  } finally {
    // ✅ Verbindung zurück in den Pool
    client.release();
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
 */
export async function getCurrentSequenceInfo(): Promise<{
  jahr: number;
  letzteNummer: number;
  naechsteAnmNr: string;
}> {
  try {
    const currentYear = new Date().getFullYear();
    
    const result = await pool.query(
      `SELECT "letzteNummer" FROM "AnmNrSequence" WHERE jahr = $1`,
      [currentYear]
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