import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Test: Firma aktualisieren\n');

  // Hole erste Firma
  const company = await prisma.company.findFirst({
    include: {
      _count: {
        select: {
          clearances: true,
          guarantees: true
        }
      },
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });

  if (!company) {
    console.error('❌ Keine Firma gefunden zum Testen');
    return;
  }

  console.log('📦 Gefundene Firma:');
  console.log(`   Name: ${company.name}`);
  console.log(`   Land: ${company.country}`);
  console.log(`   Tenant: ${company.tenant.name} (${company.tenant.domain})`);
  console.log(`   ID: ${company.id}`);
  console.log('');

  console.log('🔄 Aktualisiere Firma...');
  
  try {
    const updated = await prisma.company.update({
      where: {
        id: company.id,
        tenantId: company.tenantId
      },
      data: {
        address: company.address + ' (TEST UPDATE)'
      },
      include: {
        _count: {
          select: {
            clearances: true,
            guarantees: true
          }
        }
      }
    });

    console.log('✅ Update erfolgreich!');
    console.log(`   Neue Adresse: ${updated.address}`);
    console.log(`   _count: ${JSON.stringify(updated._count)}`);
    console.log('');

    // Rückgängig machen
    console.log('🔄 Mache Update rückgängig...');
    await prisma.company.update({
      where: { id: company.id },
      data: { address: company.address }
    });
    console.log('✅ Rückgängig gemacht');

  } catch (error: any) {
    console.error('❌ FEHLER beim Update:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Meta: ${JSON.stringify(error.meta)}`);
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

