import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starte AnmNrSequence Initialisierung...\n');
  
  const currentYear = new Date().getFullYear();
  const yearShort = currentYear.toString().slice(-2);
  
  console.log(`📅 Aktuelles Jahr: ${currentYear} (${yearShort})`);
  
  // 1. Suche höchste existierende AnmNr für dieses Jahr
  const clearances = await prisma.clearance.findMany({
    where: {
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
      console.log(`✅ Gefunden: ${clearances.length} Clearances`);
      console.log(`📊 Höchste AnmNr: ${highestAnmNr} (Nummer: ${letzteNummer})`);
    }
  } else {
    console.log('ℹ️  Keine Clearances mit AnmNr gefunden für dieses Jahr');
  }
  
  // 2. Erstelle oder Update AnmNrSequence
  const result = await prisma.anmNrSequence.upsert({
    where: { jahr: currentYear },
    update: { 
      letzteNummer,
      updatedAt: new Date()
    },
    create: {
      jahr: currentYear,
      letzteNummer
    }
  });
  
  console.log('\n✅ AnmNrSequence erfolgreich initialisiert:');
  console.log(`   Jahr: ${result.jahr}`);
  console.log(`   Letzte Nummer: ${result.letzteNummer}`);
  console.log(`   Nächste AnmNr wird sein: ${yearShort}${(letzteNummer + 1).toString().padStart(3, '0')}`);
  
  // 3. Statistik
  const totalClearances = await prisma.clearance.count();
  const clearancesWithAnmNr = await prisma.clearance.count({
    where: {
      anmNr: {
        not: null
      }
    }
  });
  
  console.log('\n📊 Statistik:');
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