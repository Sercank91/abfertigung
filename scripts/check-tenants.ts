import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Prüfe Tenants in der Datenbank...\n');

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
          companies: true,
          clearances: true
        }
      }
    }
  });

  console.log(`Gefundene Tenants: ${tenants.length}\n`);

  for (const tenant of tenants) {
    console.log(`📦 Tenant: ${tenant.name}`);
    console.log(`   Domain: ${tenant.domain}`);
    console.log(`   Status: ${tenant.status || 'KEIN STATUS GESETZT!'}`);
    console.log(`   Users: ${tenant._count.users}`);
    console.log(`   Companies: ${tenant._count.companies}`);
    console.log(`   Clearances: ${tenant._count.clearances}`);
    console.log('');
  }

  // Prüfe auch die User
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      tenantId: true,
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });

  console.log(`\n👥 Gefundene Users: ${users.length}\n`);
  for (const user of users) {
    console.log(`   ${user.username} → ${user.tenant.name} (${user.tenant.domain})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

