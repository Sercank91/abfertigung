const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_LanSeK2y3NOk@ep-withered-mountain-agv7xjmw.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Tenants mit User-Count
    const tenants = await pool.query(`
      SELECT t.id, t.name, t.domain, 
             (SELECT COUNT(*) FROM "User" u WHERE u."tenantId" = t.id) as user_count
      FROM "Tenant" t
    `);
    console.log('\n=== TENANTS ===');
    console.table(tenants.rows);
    
    // Alle Users
    const users = await pool.query(`
      SELECT u.id, u.username, u."firstName", u."lastName", u.role, t.domain as tenant_domain
      FROM "User" u
      JOIN "Tenant" t ON u."tenantId" = t.id
      ORDER BY t.domain, u.username
    `);
    console.log('\n=== USERS ===');
    console.table(users.rows);
    
  } catch (error) {
    console.error('Fehler:', error.message);
  } finally {
    await pool.end();
  }
}

check();

