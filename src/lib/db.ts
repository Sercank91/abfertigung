import { Pool } from 'pg'

// Singleton Pattern für PostgreSQL Connection
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

export const pool =
  globalForDb.pool ??
  new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'abfertigung',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}