import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantDomain = process.argv[2];

  if (!tenantDomain) {
    console.error('❌ Bitte gib die Tenant-Domain an: npm run tenant:hard-delete <domain>');
    console.error('   Beispiel: npm run tenant:hard-delete atilla');
    process.exit(1);
  }

  console.log(`🔍 Suche Tenant: ${tenantDomain}...\n`);

  const tenant = await prisma.tenant.findUnique({
    where: { domain: tenantDomain },
    include: {
      _count: {
        select: {
          users: true,
          companies: true,
          clearances: true,
          guarantees: true,
          routes: true,
          goodsLocations: true,
          authorizations: true,
          sessions: true
        }
      }
    }
  });

  if (!tenant) {
    console.error(`❌ Tenant "${tenantDomain}" nicht gefunden`);
    process.exit(1);
  }

  console.log(`📦 Tenant gefunden: ${tenant.name}`);
  console.log(`   Domain: ${tenant.domain}`);
  console.log(`   Status: ${tenant.status}`);
  console.log(`   Users: ${tenant._count.users}`);
  console.log(`   Companies: ${tenant._count.companies}`);
  console.log(`   Clearances: ${tenant._count.clearances}`);
  console.log(`   Guarantees: ${tenant._count.guarantees}`);
  console.log(`   Routes: ${tenant._count.routes}`);
  console.log(`   Goods Locations: ${tenant._count.goodsLocations}`);
  console.log(`   Authorizations: ${tenant._count.authorizations}`);
  console.log(`   Sessions: ${tenant._count.sessions}`);
  console.log('');

  console.log('⚠️  WARNUNG: HARD DELETE!');
  console.log('   Dieser Tenant wird KOMPLETT aus der Datenbank gelöscht!');
  console.log('   Alle zugehörigen Daten (Users, Companies, etc.) werden ebenfalls gelöscht!');
  console.log('   Diese Aktion kann NICHT rückgängig gemacht werden!');
  console.log('');

  // Hard-Delete (CASCADE DELETE löscht automatisch alle zugehörigen Daten)
  await prisma.tenant.delete({
    where: { id: tenant.id }
  });

  console.log(`✅ Tenant "${tenant.name}" wurde KOMPLETT gelöscht (Hard-Delete)`);
  console.log(`   Alle zugehörigen Daten wurden ebenfalls gelöscht`);
  console.log(`   Die Domain "${tenantDomain}" kann jetzt neu angelegt werden`);
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

