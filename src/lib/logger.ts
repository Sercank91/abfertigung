/**
 * 📝 Strukturiertes Logging System
 *
 * Vorteile gegenüber console.log:
 * - Log-Levels (debug, info, warn, error)
 * - Farben in der Entwicklung
 * - Strukturiertes Format (einfach zu filtern)
 * - Zentrale Kontrolle über Logs
 * - In Produktion: JSON-Format (für Log-Aggregation)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

// ANSI Farb-Codes für die Konsole
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Farben
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
} as const

const levelColors: Record<LogLevel, string> = {
  debug: colors.gray,
  info: colors.blue,
  warn: colors.yellow,
  error: colors.red,
}

const levelEmojis: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
}

/**
 * Formatiert Timestamp für Logs
 */
function formatTimestamp(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * Zentrale Log-Funktion
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const timestamp = formatTimestamp()

  if (isDevelopment) {
    // 🎨 Development: Schön formatiert mit Farben
    const color = levelColors[level]
    const emoji = levelEmojis[level]
    const levelText = level.toUpperCase().padEnd(5, ' ')

    let output = `${colors.gray}[${timestamp}]${colors.reset} ${color}${emoji} ${levelText}${colors.reset} ${message}`

    if (context && Object.keys(context).length > 0) {
      output += `\n${colors.dim}${JSON.stringify(context, null, 2)}${colors.reset}`
    }

    // Nutze passende Console-Methode
    if (level === 'error') {
      console.error(output)
    } else if (level === 'warn') {
      console.warn(output)
    } else {
      console.log(output)
    }
  } else {
    // 🏭 Production: Strukturiertes JSON-Format
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context || {}),
    }

    console.log(JSON.stringify(logEntry))
  }
}

/**
 * 🎯 Öffentliche Logger-Funktionen
 */

/**
 * Debug-Logs (nur in Development sichtbar)
 * Für sehr detaillierte Informationen während der Entwicklung
 */
export function debug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV !== 'production') {
    log('debug', message, context)
  }
}

/**
 * Info-Logs
 * Für normale Informationen (z.B. "User logged in", "API call successful")
 */
export function info(message: string, context?: LogContext): void {
  log('info', message, context)
}

/**
 * Warning-Logs
 * Für Warnungen (z.B. "Deprecated API used", "Slow query")
 */
export function warn(message: string, context?: LogContext): void {
  log('warn', message, context)
}

/**
 * Error-Logs
 * Für Fehler (z.B. "Login failed", "Database connection lost")
 */
export function error(message: string, context?: LogContext): void {
  log('error', message, context)
}

/**
 * 🔐 Spezielle Logging-Funktionen für häufige Szenarien
 */

/**
 * Login-Logs
 */
export const auth = {
  loginAttempt: (username: string, subdomain: string) => {
    info('Login-Versuch', { username, subdomain })
  },

  loginSuccess: (username: string, role: string, tenant: string) => {
    info('Login erfolgreich', { username, role, tenant })
  },

  loginFailed: (username: string, reason: string) => {
    warn('Login fehlgeschlagen', { username, reason })
  },

  unauthorized: (path: string, reason?: string) => {
    warn('Unauthorized access', { path, reason })
  },
}

/**
 * API-Logs
 */
export const api = {
  request: (method: string, path: string, userId?: string) => {
    debug('API Request', { method, path, userId })
  },

  response: (method: string, path: string, status: number, duration?: number) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug'
    log(level, 'API Response', { method, path, status, duration })
  },

  error: (method: string, path: string, error: Error) => {
    log('error', 'API Error', {
      method,
      path,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    })
  },
}

/**
 * Datenbank-Logs
 */
export const db = {
  query: (query: string, duration?: number) => {
    debug('DB Query', { query: query.substring(0, 100), duration })
  },

  slowQuery: (query: string, duration: number) => {
    warn('Slow DB Query', { query: query.substring(0, 100), duration })
  },

  error: (error: Error, query?: string) => {
    log('error', 'DB Error', {
      error: error.message,
      query: query?.substring(0, 100),
    })
  },
}

/**
 * Standard-Export (für einfache Nutzung)
 */
const logger = {
  debug,
  info,
  warn,
  error,
  auth,
  api,
  db,
}

export default logger
