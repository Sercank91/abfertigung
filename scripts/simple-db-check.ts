import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 EINFACHE DATENBANK-PRÜFUNG\n');
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
      console.log(`   - ${u.username} (${u.firstName} ${u.lastName})`);
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
      console.log(`   - ${c.name} (${c.country})`);
    }
    console.log('');

    // 5. Clearances
    console.log('📋 CLEARANCES:');
    const clearances = await prisma.clearance.findMany();
    console.log(`   Gesamt: ${clearances.length}`);
    console.log('');

    // 6. Guarantees
    console.log('💰 GUARANTEES:');
    const guarantees = await prisma.guarantee.findMany();
    console.log(`   Gesamt: ${guarantees.length}`);
    console.log('');

    // 7. Routes
    console.log('🛣️  ROUTES:');
    const routes = await prisma.route.findMany();
    console.log(`   Gesamt: ${routes.length}`);
    console.log('');

    // 8. Customs Offices
    console.log('🏛️  CUSTOMS OFFICES:');
    const customsOffices = await prisma.customsOffice.findMany();
    console.log(`   Gesamt: ${customsOffices.length}`);
    console.log('');

    // 9. User Sessions
    console.log('🔄 USER SESSIONS:');
    const sessions = await prisma.userSession.findMany();
    console.log(`   Gesamt: ${sessions.length}`);
    console.log('');

    // 10. AnmNr Sequences
    console.log('🔢 ANMNR SEQUENCES:');
    try {
      const anmNrSeqs = await prisma.anmNrSequence.findMany();
      console.log(`   Gesamt: ${anmNrSeqs.length}`);
    } catch (e: any) {
      console.log(`   ❌ Fehler: ${e.message}`);
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
    console.log(`Clearances:       ${clearances.length}`);
    console.log(`Guarantees:       ${guarantees.length}`);
    console.log(`Routes:           ${routes.length}`);
    console.log(`Customs Offices:  ${customsOffices.length}`);
    console.log(`User Sessions:    ${sessions.length}`);
    console.log('='.repeat(80));

    // Analyse
    const totalRecords = tenants.length + users.length + superAdmins.length + 
                         companies.length + clearances.length + guarantees.length + 
                         routes.length + customsOffices.length;

    console.log('\n🔍 ANALYSE:');
    if (totalRecords === 0) {
      console.log('   ⚠️  DATENBANK IST KOMPLETT LEER!');
      console.log('   Es wurden KEINE Daten gefunden.');
      console.log('   Wahrscheinlich wurde ein Database Reset durchgeführt.');
    } else if (tenants.length === 0 && users.length === 0) {
      console.log('   ⚠️  Keine Tenants und keine Users!');
      console.log('   Die Datenbank wurde wahrscheinlich zurückgesetzt.');
      console.log('   Nur System-Daten (z.B. Customs Offices) vorhanden.');
    } else if (tenants.length === 0) {
      console.log('   ⚠️  Keine Tenants gefunden!');
      console.log('   Die Datenbank enthält User aber keine Tenants.');
    } else {
      console.log('   ✅ Datenbank enthält Daten.');
      console.log(`   ${tenants.length} Tenant(s) mit ${users.length} User(s)`);
    }

  } catch (error: any) {
    console.error('\n❌ KRITISCHER FEHLER:', error.message);
    console.error('\nDies deutet darauf hin, dass:');
    console.error('1. Die Datenbank zurückgesetzt wurde');
    console.error('2. Migrationen nicht korrekt angewendet wurden');
    console.error('3. Das Schema nicht mit der DB übereinstimmt');
    console.error('\n💡 Lösung: npx prisma migrate deploy');
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

