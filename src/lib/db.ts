import { Pool } from 'pg';

// Singleton Pattern für PostgreSQL Connection
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
};

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}
