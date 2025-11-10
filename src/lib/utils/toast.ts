/**
 * Toast Utilities
 * Wrapper-Funktionen für react-hot-toast mit deutschen Meldungen
 */

import toast from 'react-hot-toast';

/**
 * Zeigt eine Erfolgs-Benachrichtigung
 *
 * @param message - Erfolgs-Nachricht
 * @param duration - Anzeigedauer in ms (optional)
 *
 * @example
 * showSuccess("Clearance erfolgreich gespeichert")
 */
export function showSuccess(message: string, duration?: number) {
  return toast.success(message, { duration });
}

/**
 * Zeigt eine Fehler-Benachrichtigung
 *
 * @param message - Fehler-Nachricht
 * @param duration - Anzeigedauer in ms (optional)
 *
 * @example
 * showError("Fehler beim Speichern der Clearance")
 */
export function showError(message: string, duration?: number) {
  return toast.error(message, { duration });
}

/**
 * Zeigt eine Info-Benachrichtigung
 *
 * @param message - Info-Nachricht
 * @param duration - Anzeigedauer in ms (optional)
 *
 * @example
 * showInfo("Bitte füllen Sie alle Pflichtfelder aus")
 */
export function showInfo(message: string, duration?: number) {
  return toast(message, {
    duration,
    icon: 'ℹ️',
    style: {
      background: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
    },
  });
}

/**
 * Zeigt eine Warn-Benachrichtigung
 *
 * @param message - Warn-Nachricht
 * @param duration - Anzeigedauer in ms (optional)
 *
 * @example
 * showWarning("Einige Felder sind möglicherweise nicht korrekt")
 */
export function showWarning(message: string, duration?: number) {
  return toast(message, {
    duration,
    icon: '⚠️',
    style: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
  });
}

/**
 * Zeigt eine Lade-Benachrichtigung
 *
 * @param message - Lade-Nachricht
 * @returns Toast-ID zum späteren Aktualisieren
 *
 * @example
 * const loadingToast = showLoading("Speichere Clearance...")
 * // ... später
 * updateToast(loadingToast, "success", "Gespeichert!")
 */
export function showLoading(message: string) {
  return toast.loading(message);
}

/**
 * Aktualisiert einen existierenden Toast
 *
 * @param toastId - ID des zu aktualisierenden Toasts
 * @param type - Neuer Toast-Typ
 * @param message - Neue Nachricht
 *
 * @example
 * const loadingToast = showLoading("Lade...")
 * updateToast(loadingToast, "success", "Erfolgreich!")
 */
export function updateToast(
  toastId: string,
  type: 'success' | 'error' | 'loading',
  message: string
) {
  if (type === 'success') {
    toast.success(message, { id: toastId });
  } else if (type === 'error') {
    toast.error(message, { id: toastId });
  } else {
    toast.loading(message, { id: toastId });
  }
}

/**
 * Schließt einen Toast
 *
 * @param toastId - ID des zu schließenden Toasts
 *
 * @example
 * const loadingToast = showLoading("Lade...")
 * dismissToast(loadingToast)
 */
export function dismissToast(toastId: string) {
  toast.dismiss(toastId);
}

/**
 * Schließt alle aktiven Toasts
 *
 * @example
 * dismissAllToasts()
 */
export function dismissAllToasts() {
  toast.dismiss();
}

/**
 * Zeigt eine Promise-basierte Benachrichtigung mit automatischem Status-Wechsel
 *
 * @param promise - Promise zu überwachen
 * @param messages - Nachrichten für loading, success, error
 * @returns Promise-Ergebnis
 *
 * @example
 * await showPromise(
 *   saveClearance(),
 *   {
 *     loading: "Speichere Clearance...",
 *     success: "Clearance erfolgreich gespeichert",
 *     error: "Fehler beim Speichern"
 *   }
 * )
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  return toast.promise(promise, messages);
}

// Vordefinierte Meldungen für häufige Aktionen

export const ToastMessages = {
  // Clearance
  clearanceSaved: 'Clearance erfolgreich gespeichert',
  clearanceDeleted: 'Clearance erfolgreich gelöscht',
  clearanceValidated: 'Clearance erfolgreich validiert',
  clearanceError: 'Fehler beim Speichern der Clearance',
  clearanceDeleteError: 'Fehler beim Löschen der Clearance',
  clearanceValidationError: 'Validierung fehlgeschlagen',

  // Generic
  saveSuccess: 'Erfolgreich gespeichert',
  saveError: 'Fehler beim Speichern',
  deleteSuccess: 'Erfolgreich gelöscht',
  deleteError: 'Fehler beim Löschen',
  loadError: 'Fehler beim Laden der Daten',
  networkError: 'Netzwerkfehler. Bitte versuchen Sie es erneut.',
  validationError: 'Bitte überprüfen Sie Ihre Eingaben',
  permissionError: 'Sie haben keine Berechtigung für diese Aktion',

  // Auth
  loginSuccess: 'Erfolgreich angemeldet',
  loginError: 'Anmeldung fehlgeschlagen',
  logoutSuccess: 'Erfolgreich abgemeldet',
  sessionExpired: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',

  // File Upload
  uploadSuccess: 'Datei erfolgreich hochgeladen',
  uploadError: 'Fehler beim Hochladen der Datei',
  uploadInProgress: 'Datei wird hochgeladen...',

  // Form
  requiredFields: 'Bitte füllen Sie alle Pflichtfelder aus',
  invalidData: 'Einige Felder enthalten ungültige Daten',
  duplicateEntry: 'Ein Eintrag mit diesen Daten existiert bereits',
} as const;
