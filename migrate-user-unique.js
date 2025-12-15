const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LanSeK2y3NOk@ep-withered-mountain-agv7xjmw.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Drop old unique constraints
    await pool.query('DROP INDEX IF EXISTS "User_email_key"');
    console.log('✓ Dropped User_email_key');
    
    await pool.query('DROP INDEX IF EXISTS "User_username_key"');
    console.log('✓ Dropped User_username_key');
    
    // Create new tenant-specific constraints
    await pool.query('CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId")');
    console.log('✓ Created User_tenantId_idx');
    
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_username_key" ON "User"("tenantId", "username")');
    console.log('✓ Created User_tenantId_username_key');
    
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_key" ON "User"("tenantId", "email")');
    console.log('✓ Created User_tenantId_email_key');
    
    console.log('\n✅ Migration erfolgreich!');
    console.log('Jetzt können verschiedene Tenants denselben Benutzernamen haben.');
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();

