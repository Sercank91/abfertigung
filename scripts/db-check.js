const { Client } = require("pg");
require("dotenv").config({ path: ".env" });

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();

  const tenants = await c.query('SELECT id, domain, name FROM "Tenant" ORDER BY domain');
  console.log("TENANTS:");
  console.table(tenants.rows);

  for (const t of tenants.rows) {
    const u = await c.query('SELECT COUNT(*)::int AS users FROM "User" WHERE "tenantId"=$1', [t.id]);
    const co = await c.query('SELECT COUNT(*)::int AS companies FROM "Company" WHERE "tenantId"=$1', [t.id]);
    const r = await c.query('SELECT COUNT(*)::int AS routes FROM "Route" WHERE "tenantId"=$1', [t.id]);
    const g = await c.query('SELECT COUNT(*)::int AS guarantees FROM "Guarantee" WHERE "tenantId"=$1', [t.id]);

    console.log(
      `Tenant ${t.domain} (${t.id}) -> users=${u.rows[0].users}, companies=${co.rows[0].companies}, routes=${r.rows[0].routes}, guarantees=${g.rows[0].guarantees}`
    );
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
