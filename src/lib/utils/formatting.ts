/**
 * Formatting Utilities
 * Funktionen für Formatierung von Daten, Währungen, etc.
 */

/**
 * Formatiert ein Datum für die Anzeige
 *
 * @param date - Datum als Date-Objekt oder String
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatierter Datum-String
 *
 * @example
 * formatDate(new Date()) // → "10.11.2025"
 * formatDate(new Date(), { dateStyle: 'full' }) // → "Sonntag, 10. November 2025"
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }
): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return new Intl.DateTimeFormat('de-DE', options).format(dateObj);
}

/**
 * Formatiert ein Datum mit Uhrzeit
 *
 * @param date - Datum als Date-Objekt oder String
 * @returns Formatierter Datum-Zeit-String
 *
 * @example
 * formatDateTime(new Date()) // → "10.11.2025, 16:30"
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatiert ein Datum für Input-Felder (ISO Format)
 *
 * @param date - Datum als Date-Objekt oder String
 * @returns ISO-Datum-String (YYYY-MM-DD)
 *
 * @example
 * formatDateForInput(new Date()) // → "2025-11-10"
 */
export function formatDateForInput(date: Date | string): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toISOString().split('T')[0];
}

/**
 * Formatiert einen Währungsbetrag
 *
 * @param amount - Betrag als Zahl
 * @param currency - Währungscode (Standard: EUR)
 * @returns Formatierter Währungs-String
 *
 * @example
 * formatCurrency(1234.56) // → "1.234,56 €"
 * formatCurrency(1234.56, 'USD') // → "1.234,56 $"
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Formatiert eine Zahl mit Tausender-Trennzeichen
 *
 * @param num - Zahl
 * @param decimals - Anzahl Dezimalstellen (optional)
 * @returns Formatierte Zahl
 *
 * @example
 * formatNumber(1234567) // → "1.234.567"
 * formatNumber(1234.5678, 2) // → "1.234,57"
 */
export function formatNumber(num: number, decimals?: number): string {
  if (num === null || num === undefined) return '';

  const options: Intl.NumberFormatOptions = {};
  if (decimals !== undefined) {
    options.minimumFractionDigits = decimals;
    options.maximumFractionDigits = decimals;
  }

  return new Intl.NumberFormat('de-DE', options).format(num);
}

/**
 * Formatiert ein Gewicht (kg)
 *
 * @param weight - Gewicht in kg
 * @returns Formatierter String mit Einheit
 *
 * @example
 * formatWeight(1234.56) // → "1.234,56 kg"
 */
export function formatWeight(weight: number): string {
  if (weight === null || weight === undefined) return '';
  return `${formatNumber(weight, 2)} kg`;
}

/**
 * Kürzt einen Text und fügt Ellipsis hinzu
 *
 * @param text - Text
 * @param maxLength - Maximale Länge
 * @returns Gekürzter Text
 *
 * @example
 * truncateText("Ein sehr langer Text", 10) // → "Ein sehr l..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Kapitalisiert den ersten Buchstaben eines Strings
 *
 * @param str - String
 * @returns String mit kapitalisiertem ersten Buchstaben
 *
 * @example
 * capitalize("hello") // → "Hello"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Konvertiert einen String in Title Case
 *
 * @param str - String
 * @returns String in Title Case
 *
 * @example
 * toTitleCase("hello world") // → "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Entfernt Whitespace und normalisiert einen String
 *
 * @param str - String
 * @returns Normalisierter String
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Formatiert eine Telefonnummer
 *
 * @param phone - Telefonnummer
 * @returns Formatierte Telefonnummer
 *
 * @example
 * formatPhone("+4312345678") // → "+43 1 234 5678"
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';

  // Entferne alle Nicht-Ziffern außer +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Österreichische Nummern formatieren
  if (cleaned.startsWith('+43')) {
    const number = cleaned.slice(3);
    if (number.length >= 3) {
      return `+43 ${number.slice(0, 1)} ${number.slice(1, 4)} ${number.slice(4)}`.trim();
    }
  }

  return phone;
}

/**
 * Validiert eine E-Mail-Adresse
 *
 * @param email - E-Mail-Adresse
 * @returns true wenn gültig
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formatiert einen Dateinamen (entfernt ungültige Zeichen)
 *
 * @param filename - Dateiname
 * @returns Bereinigter Dateiname
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  return filename
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}
