import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 BASIS DATENBANK-PRÜFUNG\n');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // 1. Tenants
    console.log('📦 TENANTS:');
    const tenants = await prisma.tenant.findMany();
    console.log(`   Gesamt: ${tenants.length}`);
    for (const t of tenants) {
      console.log(`   - ${t.name} (${t.domain}) - Status: ${t.status}`);
    }
    console.log('');

    // 2. Users
    console.log('👥 USERS:');
    const users = await prisma.user.findMany();
    console.log(`   Gesamt: ${users.length}`);
    for (const u of users) {
      console.log(`   - ${u.username} (${u.firstName} ${u.lastName}) - Tenant ID: ${u.tenantId.substring(0, 8)}...`);
    }
    console.log('');

    // 3. Super Admins
    console.log('👑 SUPER ADMINS:');
    const superAdmins = await prisma.superAdmin.findMany();
    console.log(`   Gesamt: ${superAdmins.length}`);
    for (const a of superAdmins) {
      console.log(`   - ${a.username} (${a.firstName} ${a.lastName})`);
    }
    console.log('');

    // 4. Companies
    console.log('🏢 COMPANIES:');
    const companies = await prisma.company.findMany();
    console.log(`   Gesamt: ${companies.length}`);
    for (const c of companies) {
      console.log(`   - ${c.name} (${c.country}) - Tenant ID: ${c.tenantId.substring(0, 8)}...`);
    }
    console.log('');

    // ZUSAMMENFASSUNG
    console.log('='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log('='.repeat(80));
    console.log(`Tenants:          ${tenants.length}`);
    console.log(`  - Aktiv:        ${tenants.filter(t => t.status === 'active').length}`);
    console.log(`  - Inaktiv:      ${tenants.filter(t => t.status === 'inactive').length}`);
    console.log(`  - Gelöscht:     ${tenants.filter(t => t.status === 'deleted').length}`);
    console.log(`Users:            ${users.length}`);
    console.log(`Super Admins:     ${superAdmins.length}`);
    console.log(`Companies:        ${companies.length}`);
    console.log('='.repeat(80));

    // Analyse
    console.log('\n🔍 ANALYSE:');
    if (tenants.length === 0 && users.length === 0 && superAdmins.length === 0) {
      console.log('   ⚠️  DATENBANK IST KOMPLETT LEER!');
      console.log('   Es wurden KEINE Daten gefunden.');
      console.log('   Die Datenbank wurde zurückgesetzt.');
      console.log('\n💡 Lösung:');
      console.log('   npm run seed:tenants      # Tenants und User anlegen');
      console.log('   npm run admin:bootstrap   # Super-Admin anlegen');
    } else {
      console.log('   ✅ Datenbank enthält Daten:');
      console.log(`      - ${tenants.length} Tenant(s)`);
      console.log(`      - ${users.length} User(s)`);
      console.log(`      - ${superAdmins.length} Super-Admin(s)`);
      console.log(`      - ${companies.length} Firma(en)`);
      
      if (tenants.length > 0 && users.length > 0) {
        console.log('\n   ✅ System ist einsatzbereit!');
      }
    }

  } catch (error: any) {
    console.error('\n❌ FEHLER:', error.message);
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

