import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starte AnmNrSequence Initialisierung (Tenant-Scoped)...\n');
  
  const currentYear = new Date().getFullYear();
  const yearShort = currentYear.toString().slice(-2);
  
  console.log(`📅 Aktuelles Jahr: ${currentYear} (${yearShort})`);
  
  // 1. Hole alle Tenants
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      domain: true
    }
  });
  
  if (tenants.length === 0) {
    console.log('⚠️  Keine Tenants gefunden. Bitte zuerst Tenants anlegen.');
    return;
  }
  
  console.log(`📊 Gefunden: ${tenants.length} Tenant(s)\n`);
  
  // 2. Iteriere über alle Tenants
  for (const tenant of tenants) {
    console.log(`🔄 Verarbeite Tenant: ${tenant.domain} (${tenant.id})`);
    
    // Suche höchste existierende AnmNr für diesen Tenant und dieses Jahr
    const clearances = await prisma.clearance.findMany({
      where: {
        tenantId: tenant.id,
        anmNr: {
          startsWith: yearShort
        }
      },
      select: {
        anmNr: true
      },
      orderBy: {
        anmNr: 'desc'
      }
    });
    
    let letzteNummer = 0;
    
    if (clearances.length > 0) {
      const highestAnmNr = clearances[0].anmNr;
      
      if (highestAnmNr && highestAnmNr.length === 5) {
        letzteNummer = parseInt(highestAnmNr.slice(2), 10);
        console.log(`   ✅ Gefunden: ${clearances.length} Clearances`);
        console.log(`   📊 Höchste AnmNr: ${highestAnmNr} (Nummer: ${letzteNummer})`);
      }
    } else {
      console.log('   ℹ️  Keine Clearances mit AnmNr gefunden für dieses Jahr');
    }
    
    // Erstelle oder Update AnmNrSequence für diesen Tenant
    const result = await prisma.anmNrSequence.upsert({
      where: {
        tenantId_jahr: {
          tenantId: tenant.id,
          jahr: currentYear,
        },
      },    
      update: { 
        letzteNummer,
        updatedAt: new Date()
      },
      create: {
        tenant: {
          connect: {
            id: tenant.id
          }
        },
        jahr: currentYear,
        letzteNummer
      }
    });
    
    console.log(`   ✅ AnmNrSequence initialisiert: Jahr ${result.jahr}, Letzte Nummer: ${result.letzteNummer}`);
    console.log(`   ➡️  Nächste AnmNr: ${yearShort}${(letzteNummer + 1).toString().padStart(3, '0')}\n`);
  }
  
  // 3. Gesamt-Statistik
  const totalClearances = await prisma.clearance.count();
  const clearancesWithAnmNr = await prisma.clearance.count({
    where: {
      anmNr: {
        not: null
      }
    }
  });
  
  console.log('📊 Gesamt-Statistik:');
  console.log(`   Gesamt Clearances: ${totalClearances}`);
  console.log(`   Mit AnmNr: ${clearancesWithAnmNr}`);
  console.log(`   Ohne AnmNr: ${totalClearances - clearancesWithAnmNr}`);
  
  if (totalClearances - clearancesWithAnmNr > 0) {
    console.log('\n⚠️  WARNUNG: Es gibt Clearances ohne AnmNr!');
    console.log('   Diese sollten manuell eine AnmNr bekommen.');
  }
  
  console.log('\n✅ Fertig! Sie können jetzt neue Clearances erstellen.');
}

main()
  .catch(e => {
    console.error('\n❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });