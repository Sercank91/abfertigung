const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAnmNr() {
  try {
    console.log('🚀 Starte AnmNr Daten-Migration...\n');
    
    const jahr = new Date().getFullYear() % 100; // 2025 → 25
    console.log(`📅 Aktuelles Jahr: ${jahr}`);
    
    // Erstelle Sequenz für aktuelles Jahr
    let sequence = await prisma.anmNrSequence.findUnique({
      where: { jahr }
    });
    
    if (!sequence) {
      console.log('📝 Erstelle neue Sequenz für Jahr ' + jahr);
      sequence = await prisma.anmNrSequence.create({
        data: { jahr, letzteNummer: 0 }
      });
    }
    
    console.log(`📊 Aktuelle Nummer: ${sequence.letzteNummer}\n`);
    
    // Hole alle Clearances ohne AnmNr
    const clearances = await prisma.clearance.findMany({
      where: { anmNr: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        lrn: true,
        createdAt: true,
        company: {
          select: { name: true }
        }
      }
    });
    
    if (clearances.length === 0) {
      console.log('✅ Keine Clearances ohne AnmNr gefunden!\n');
      return;
    }
    
    console.log(`📦 Gefunden: ${clearances.length} Clearances ohne AnmNr\n`);
    console.log('─'.repeat(70));
    
    for (let i = 0; i < clearances.length; i++) {
      const clearance = clearances[i];
      
      // Erhöhe Sequenz
      sequence = await prisma.anmNrSequence.update({
        where: { jahr },
        data: { letzteNummer: { increment: 1 } }
      });
      
      // Generiere AnmNr: YYNNN (z.B. 25001)
      const anmNr = `${jahr}${String(sequence.letzteNummer).padStart(3, '0')}`;
      
      // Update Clearance
      await prisma.clearance.update({
        where: { id: clearance.id },
        data: { anmNr }
      });
      
      console.log(`${i + 1}. ✅ ${clearance.lrn.padEnd(20)} → AnmNr: ${anmNr}  |  ${clearance.company.name}`);
    }
    
    console.log('─'.repeat(70));
    console.log('\n🎉 Migration erfolgreich!\n');
    
    // Statistik
    const total = await prisma.clearance.count();
    const withAnmNr = await prisma.clearance.count({
      where: { anmNr: { not: null } }
    });
    
    const seq = await prisma.anmNrSequence.findUnique({ where: { jahr } });
    
    console.log('═'.repeat(70));
    console.log('📊 Statistik:');
    console.log(`   • Total Clearances: ${total}`);
    console.log(`   • Mit AnmNr: ${withAnmNr}`);
    console.log(`   • Nächste AnmNr: ${jahr}${String(seq.letzteNummer + 1).padStart(3, '0')}`);
    console.log('═'.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAnmNr();