/**
 * Clearance Utilities
 * Clearance-spezifische Hilfsfunktionen
 */

import { ClearanceStatus } from '@/types';

/**
 * Status-Konfiguration für Clearances
 */
export const CLEARANCE_STATUS_CONFIG = {
  in_bearbeitung: {
    label: 'In Bearbeitung',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300'
  },
  validiert: {
    label: 'Validiert',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300'
  },
  eingereicht: {
    label: 'Eingereicht',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300'
  },
  genehmigt: {
    label: 'Genehmigt',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300'
  },
  abgelehnt: {
    label: 'Abgelehnt',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300'
  },
  storniert: {
    label: 'Storniert',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300'
  }
} as const;

/**
 * Gibt das Status-Label für einen Clearance-Status zurück
 *
 * @param status - Clearance Status
 * @returns Status-Label
 *
 * @example
 * getClearanceStatusLabel("in_bearbeitung") // → "In Bearbeitung"
 */
export function getClearanceStatusLabel(status: ClearanceStatus): string {
  return CLEARANCE_STATUS_CONFIG[status]?.label || status;
}

/**
 * Gibt die Farb-Konfiguration für einen Status zurück
 *
 * @param status - Clearance Status
 * @returns Farb-Konfiguration
 */
export function getClearanceStatusColors(status: ClearanceStatus) {
  return CLEARANCE_STATUS_CONFIG[status] || CLEARANCE_STATUS_CONFIG.in_bearbeitung;
}

/**
 * Gibt alle verfügbaren Status zurück
 */
export function getAllClearanceStatuses(): ClearanceStatus[] {
  return Object.keys(CLEARANCE_STATUS_CONFIG) as ClearanceStatus[];
}

/**
 * Prüft ob ein Status ein finaler Status ist (nicht mehr änderbar)
 *
 * @param status - Clearance Status
 * @returns true wenn finaler Status
 */
export function isFinalStatus(status: ClearanceStatus): boolean {
  return ['genehmigt', 'abgelehnt', 'storniert'].includes(status);
}

/**
 * Gibt den nächsten möglichen Status zurück
 *
 * @param currentStatus - Aktueller Status
 * @returns Array von möglichen nächsten Status
 */
export function getNextPossibleStatuses(
  currentStatus: ClearanceStatus
): ClearanceStatus[] {
  const statusFlow: Record<ClearanceStatus, ClearanceStatus[]> = {
    in_bearbeitung: ['validiert', 'storniert'],
    validiert: ['eingereicht', 'in_bearbeitung', 'storniert'],
    eingereicht: ['genehmigt', 'abgelehnt', 'validiert'],
    genehmigt: [],
    abgelehnt: ['in_bearbeitung'],
    storniert: []
  };

  return statusFlow[currentStatus] || [];
}

/**
 * Validiert ein LRN (Local Reference Number) Format
 *
 * @param lrn - LRN String
 * @returns true wenn gültig
 *
 * LRN Format: Ländercode + Jahr + eindeutige Nummer
 * Beispiel: AT202500001
 */
export function isValidLRN(lrn: string): boolean {
  if (!lrn) return false;

  // LRN muss mindestens 6 Zeichen haben
  if (lrn.length < 6) return false;

  // Sollte mit 2 Buchstaben beginnen (Ländercode)
  const countryCodeRegex = /^[A-Z]{2}/;
  return countryCodeRegex.test(lrn);
}

/**
 * Generiert einen LRN-Vorschlag basierend auf Ländercode und Datum
 *
 * @param countryCode - Ländercode (z.B. "AT")
 * @param date - Datum
 * @param sequence - Sequenznummer
 * @returns Generierter LRN
 *
 * @example
 * generateLRNSuggestion("AT", new Date(), 1) // → "AT20250000001"
 */
export function generateLRNSuggestion(
  countryCode: string,
  date: Date,
  sequence: number
): string {
  const year = date.getFullYear();
  const sequenceStr = sequence.toString().padStart(5, '0');

  return `${countryCode.toUpperCase()}${year}${sequenceStr}`;
}

/**
 * Validiert ein Kennzeichen
 *
 * @param licensePlate - Kennzeichen
 * @returns true wenn gültig
 */
export function isValidLicensePlate(licensePlate: string): boolean {
  if (!licensePlate) return false;

  // Mindestens 2 Zeichen, nur Buchstaben, Zahlen und Bindestriche
  const regex = /^[A-Z0-9\-]{2,15}$/i;
  return regex.test(licensePlate);
}

/**
 * Normalisiert ein Kennzeichen (Großbuchstaben, keine Leerzeichen)
 *
 * @param licensePlate - Kennzeichen
 * @returns Normalisiertes Kennzeichen
 *
 * @example
 * normalizeLicensePlate("w 123 ab") // → "W-123-AB"
 */
export function normalizeLicensePlate(licensePlate: string): string {
  if (!licensePlate) return '';

  return licensePlate
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\-]/g, '');
}

/**
 * Berechnet die Anzahl der Tage bis zum Ankunftsdatum
 *
 * @param arrivalDate - Ankunftsdatum
 * @returns Anzahl Tage (negativ wenn in der Vergangenheit)
 */
export function getDaysUntilArrival(arrivalDate: Date | string): number {
  const arrival = typeof arrivalDate === 'string' ? new Date(arrivalDate) : arrivalDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  arrival.setHours(0, 0, 0, 0);

  const diffTime = arrival.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Gibt eine formatierte Zeitangabe bis zur Ankunft zurück
 *
 * @param arrivalDate - Ankunftsdatum
 * @returns Formatierte Zeitangabe
 *
 * @example
 * getArrivalTimeMessage(tomorrow) // → "In 1 Tag"
 * getArrivalTimeMessage(yesterday) // → "Vor 1 Tag überfällig"
 */
export function getArrivalTimeMessage(arrivalDate: Date | string): string {
  const days = getDaysUntilArrival(arrivalDate);

  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  if (days === -1) return 'Gestern';
  if (days > 0) return `In ${days} Tagen`;
  return `Vor ${Math.abs(days)} Tagen überfällig`;
}

/**
 * Prüft ob ein Clearance überfällig ist
 *
 * @param arrivalDate - Ankunftsdatum
 * @param status - Clearance Status
 * @returns true wenn überfällig
 */
export function isOverdue(arrivalDate: Date | string, status: ClearanceStatus): boolean {
  // Nur nicht-finale Status können überfällig sein
  if (isFinalStatus(status)) return false;

  const days = getDaysUntilArrival(arrivalDate);
  return days < 0;
}

/**
 * Sortiert Clearances nach Priorität (überfällige zuerst)
 *
 * @param clearances - Array von Clearances mit arrivalDate und status
 * @returns Sortiertes Array
 */
export function sortByPriority<T extends { arrivalDate: Date | string; status: string }>(
  clearances: T[]
): T[] {
  return [...clearances].sort((a, b) => {
    const aOverdue = isOverdue(a.arrivalDate, a.status as ClearanceStatus);
    const bOverdue = isOverdue(b.arrivalDate, b.status as ClearanceStatus);

    // Überfällige zuerst
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Dann nach Ankunftsdatum
    const aDate = new Date(a.arrivalDate).getTime();
    const bDate = new Date(b.arrivalDate).getTime();
    return aDate - bDate;
  });
}
