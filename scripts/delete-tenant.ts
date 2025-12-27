import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantDomain = process.argv[2];

  if (!tenantDomain) {
    console.error('❌ Bitte gib die Tenant-Domain an: npm run tenant:delete <domain>');
    console.error('   Beispiel: npm run tenant:delete atilla');
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
          routes: true
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
  console.log('');

  // Soft-Delete
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { status: 'deleted' }
  });

  console.log(`✅ Tenant "${tenant.name}" wurde als gelöscht markiert (Soft-Delete)`);
  console.log(`   Der Tenant ist jetzt nicht mehr aufrufbar`);
  console.log(`   Die Daten bleiben in der Datenbank erhalten`);
  console.log('');
  console.log('💡 Tipp: Um den Tenant komplett zu löschen (HARD DELETE):');
  console.log(`   npx prisma studio → Tenant "${tenant.name}" manuell löschen`);
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

