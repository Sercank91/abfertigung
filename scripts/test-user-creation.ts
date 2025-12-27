import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Test: User-Erstellung mit gleichem Username in verschiedenen Tenants\n');

  // Hole Tenants
  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    take: 3
  });

  if (tenants.length < 2) {
    console.error('❌ Mindestens 2 Tenants erforderlich für den Test');
    return;
  }

  console.log(`Gefundene Tenants: ${tenants.length}`);
  for (const t of tenants) {
    console.log(`  - ${t.name} (${t.domain})`);
  }
  console.log('');

  const testUsername = 'admin';
  const hashedPassword = await bcrypt.hash('Test123!', 10);

  // Versuche User mit gleichem Username in verschiedenen Tenants anzulegen
  for (let i = 0; i < tenants.length; i++) {
    const tenant = tenants[i];
    
    console.log(`Test ${i + 1}: Erstelle User "${testUsername}" für Tenant "${tenant.name}"...`);
    
    try {
      // Prüfe ob User bereits existiert
      const existing = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          username: testUsername
        }
      });

      if (existing) {
        console.log(`  ℹ️  User "${testUsername}" existiert bereits für Tenant "${tenant.name}"`);
        console.log(`     ID: ${existing.id}`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          username: testUsername,
          email: `${testUsername}@${tenant.domain}.test`,
          password: hashedPassword,
          firstName: 'Test',
          lastName: `Admin ${tenant.domain}`,
          role: 'admin',
          tenantId: tenant.id,
          isActive: true
        }
      });

      console.log(`  ✅ User "${testUsername}" erfolgreich erstellt für Tenant "${tenant.name}"`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Email: ${user.email}`);
      
    } catch (error: any) {
      console.error(`  ❌ FEHLER beim Erstellen für Tenant "${tenant.name}":`);
      console.error(`     Code: ${error.code}`);
      console.error(`     Message: ${error.message}`);
      
      if (error.code === 'P2002') {
        console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        console.error('');
        console.error('     🔍 ANALYSE: Unique Constraint Violation!');
        console.error('     Das bedeutet: Es gibt einen GLOBALEN Unique Constraint auf username');
        console.error('     Erwartet: Nur @@unique([tenantId, username])');
        console.error('     Problem: Zusätzlicher @unique auf username (global)');
      }
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('📊 ERGEBNIS:');
  console.log('='.repeat(80));
  
  // Zähle wie viele User mit dem gleichen Username existieren
  const usersWithSameUsername = await prisma.user.findMany({
    where: { username: testUsername },
    include: {
      tenant: {
        select: {
          name: true,
          domain: true
        }
      }
    }
  });

  console.log(`User mit Username "${testUsername}": ${usersWithSameUsername.length}`);
  for (const u of usersWithSameUsername) {
    console.log(`  - ${u.tenant.name} (${u.tenant.domain})`);
  }
  console.log('');

  if (usersWithSameUsername.length >= 2) {
    console.log('✅ ERFOLG: Username kann in mehreren Tenants verwendet werden!');
    console.log('   Die Unique Constraints sind korrekt konfiguriert.');
  } else if (usersWithSameUsername.length === 1) {
    console.log('⚠️  WARNUNG: Username konnte nur in einem Tenant erstellt werden!');
    console.log('   Es gibt wahrscheinlich einen globalen Unique Constraint.');
    console.log('');
    console.log('💡 LÖSUNG: Entferne den globalen Unique Constraint:');
    console.log('   ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_username_key";');
  } else {
    console.log('ℹ️  Keine User mit diesem Username gefunden.');
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

