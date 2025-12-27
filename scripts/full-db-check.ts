import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VOLLSTÄNDIGE DATENBANK-PRÜFUNG\n');
  console.log('='.repeat(80));
  console.log('\n');

  // 1. Tenants
  console.log('📦 TENANTS:');
  console.log('-'.repeat(80));
  const tenants = await prisma.tenant.findMany({
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
          sessions: true,
          anmNrSequences: true
        }
      }
    }
  });
  console.log(`Gesamt: ${tenants.length} Tenants\n`);
  
  for (const tenant of tenants) {
    console.log(`  • ${tenant.name}`);
    console.log(`    Domain: ${tenant.domain}`);
    console.log(`    Status: ${tenant.status}`);
    console.log(`    Erstellt: ${tenant.createdAt.toLocaleString('de-DE')}`);
    console.log(`    Users: ${tenant._count.users}`);
    console.log(`    Companies: ${tenant._count.companies}`);
    console.log(`    Clearances: ${tenant._count.clearances}`);
    console.log(`    Guarantees: ${tenant._count.guarantees}`);
    console.log(`    Routes: ${tenant._count.routes}`);
    console.log(`    Goods Locations: ${tenant._count.goodsLocations}`);
    console.log(`    Authorizations: ${tenant._count.authorizations}`);
    console.log(`    Sessions: ${tenant._count.sessions}`);
    console.log(`    AnmNr Sequences: ${tenant._count.anmNrSequences}`);
    console.log('');
  }

  // 2. Users
  console.log('\n👥 USERS:');
  console.log('-'.repeat(80));
  const users = await prisma.user.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });
  console.log(`Gesamt: ${users.length} Users\n`);
  
  for (const user of users) {
    console.log(`  • ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`    Email: ${user.email || 'keine'}`);
    console.log(`    Rolle: ${user.role}`);
    console.log(`    Tenant: ${user.tenant.name} (${user.tenant.domain})`);
    console.log(`    Aktiv: ${user.isActive ? 'Ja' : 'Nein'}`);
    console.log(`    Erstellt: ${user.createdAt.toLocaleString('de-DE')}`);
    console.log('');
  }

  // 3. Super Admins
  console.log('\n👑 SUPER ADMINS:');
  console.log('-'.repeat(80));
  const superAdmins = await prisma.superAdmin.findMany();
  console.log(`Gesamt: ${superAdmins.length} Super Admins\n`);
  
  for (const admin of superAdmins) {
    console.log(`  • ${admin.username} (${admin.firstName} ${admin.lastName})`);
    console.log(`    Email: ${admin.email}`);
    console.log(`    Aktiv: ${admin.isActive ? 'Ja' : 'Nein'}`);
    console.log(`    Erstellt: ${admin.createdAt.toLocaleString('de-DE')}`);
    console.log('');
  }

  // 4. Companies
  console.log('\n🏢 COMPANIES (FIRMEN):');
  console.log('-'.repeat(80));
  const companies = await prisma.company.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });
  console.log(`Gesamt: ${companies.length} Companies\n`);
  
  for (const company of companies) {
    console.log(`  • ${company.name}`);
    console.log(`    Land: ${company.country}`);
    console.log(`    Ort: ${company.postalCode} ${company.city}`);
    console.log(`    Tenant: ${company.tenant.name} (${company.tenant.domain})`);
    console.log(`    Aktiv: ${company.isActive ? 'Ja' : 'Nein'}`);
    console.log('');
  }

  // 5. Clearances
  console.log('\n📋 CLEARANCES (ABFERTIGUNGEN):');
  console.log('-'.repeat(80));
  const clearances = await prisma.clearance.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });
  console.log(`Gesamt: ${clearances.length} Clearances\n`);

  // 6. Guarantees
  console.log('\n💰 GUARANTEES (BÜRGSCHAFTEN):');
  console.log('-'.repeat(80));
  const guarantees = await prisma.guarantee.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });
  console.log(`Gesamt: ${guarantees.length} Guarantees\n`);

  // 7. Routes
  console.log('\n🛣️  ROUTES:');
  console.log('-'.repeat(80));
  const routes = await prisma.route.findMany({
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });
  console.log(`Gesamt: ${routes.length} Routes\n`);

  // 8. Customs Offices
  console.log('\n🏛️  CUSTOMS OFFICES (ZOLLÄMTER):');
  console.log('-'.repeat(80));
  const customsOffices = await prisma.customsOffice.findMany();
  console.log(`Gesamt: ${customsOffices.length} Customs Offices\n`);

  // 9. User Sessions
  console.log('\n🔄 USER SESSIONS (PRESENCE):');
  console.log('-'.repeat(80));
  const sessions = await prisma.userSession.findMany({
    include: {
      user: {
        select: {
          username: true,
          firstName: true,
          lastName: true
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
  console.log(`Gesamt: ${sessions.length} Sessions\n`);
  
  for (const session of sessions) {
    console.log(`  • ${session.user.username} (${session.user.firstName} ${session.user.lastName})`);
    console.log(`    Tenant: ${session.tenant.name}`);
    console.log(`    Letzte Aktivität: ${session.lastSeenAt.toLocaleString('de-DE')}`);
    console.log(`    Aktuelle Seite: ${session.currentPath || 'keine'}`);
    console.log('');
  }

  // 10. OCR Documents
  console.log('\n📄 OCR DOCUMENTS:');
  console.log('-'.repeat(80));
  const ocrDocs = await prisma.ocrDocument.findMany();
  console.log(`Gesamt: ${ocrDocs.length} OCR Documents\n`);

  // ZUSAMMENFASSUNG
  console.log('\n' + '='.repeat(80));
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
  console.log(`OCR Documents:    ${ocrDocs.length}`);
  console.log('='.repeat(80));

  // Prüfe ob Datenbank leer ist
  const totalRecords = tenants.length + users.length + superAdmins.length + 
                       companies.length + clearances.length + guarantees.length + 
                       routes.length + customsOffices.length;

  if (totalRecords === 0) {
    console.log('\n⚠️  WARNUNG: Datenbank ist KOMPLETT LEER!');
    console.log('   Es wurden KEINE Daten gefunden.');
    console.log('   Möglicherweise wurde ein Database Reset durchgeführt.');
  } else if (tenants.length === 0) {
    console.log('\n⚠️  WARNUNG: Keine Tenants gefunden!');
    console.log('   Die Datenbank enthält Daten, aber keine Tenants.');
  } else {
    console.log('\n✅ Datenbank enthält Daten.');
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

