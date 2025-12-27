import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Tenants und Test-User...\n');

  // 1. Erstelle Tenant: Verag
  let verag = await prisma.tenant.findUnique({
    where: { domain: 'verag' }
  });

  if (!verag) {
    verag = await prisma.tenant.create({
      data: {
        name: 'Verag Spedition GmbH',
        domain: 'verag',
        status: 'active'
      }
    });
    console.log('✅ Tenant erstellt: Verag Spedition GmbH (verag)');
  } else {
    console.log('ℹ️  Tenant existiert bereits: Verag');
  }

  // 2. Erstelle Tenant: DSV
  let dsv = await prisma.tenant.findUnique({
    where: { domain: 'dsv' }
  });

  if (!dsv) {
    dsv = await prisma.tenant.create({
      data: {
        name: 'DSV Spedition',
        domain: 'dsv',
        status: 'active'
      }
    });
    console.log('✅ Tenant erstellt: DSV Spedition (dsv)');
  } else {
    console.log('ℹ️  Tenant existiert bereits: DSV');
  }

  // 3. Erstelle Test-User für Verag
  const veragUserExists = await prisma.user.findFirst({
    where: {
      tenantId: verag.id,
      username: 'test'
    }
  });

  if (!veragUserExists) {
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.user.create({
      data: {
        username: 'test',
        email: 'test@verag.ch',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'mitarbeiter',
        tenantId: verag.id,
        isActive: true
      }
    });
    console.log('✅ Test-User erstellt für Verag: test / test123');
  } else {
    console.log('ℹ️  Test-User existiert bereits für Verag');
  }

  // 4. Erstelle Test-User für DSV
  const dsvUserExists = await prisma.user.findFirst({
    where: {
      tenantId: dsv.id,
      username: 'dsvtest'
    }
  });

  if (!dsvUserExists) {
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.user.create({
      data: {
        username: 'dsvtest',
        email: 'test@dsv.com',
        password: hashedPassword,
        firstName: 'DSV Test',
        lastName: 'User',
        role: 'mitarbeiter',
        tenantId: dsv.id,
        isActive: true
      }
    });
    console.log('✅ Test-User erstellt für DSV: dsvtest / test123');
  } else {
    console.log('ℹ️  Test-User existiert bereits für DSV');
  }

  // 5. Erstelle Test-Firmen für Verag
  const veragCompanyExists = await prisma.company.findFirst({
    where: {
      tenantId: verag.id
    }
  });

  if (!veragCompanyExists) {
    await prisma.company.create({
      data: {
        name: 'Musterfirma AG',
        country: 'CH',
        address: 'Musterstrasse 123',
        postalCode: '8000',
        city: 'Zürich',
        emails: ['info@musterfirma.ch'],
        phones: ['+41 44 123 45 67'],
        tenantId: verag.id,
        isActive: true
      }
    });
    console.log('✅ Test-Firma erstellt für Verag: Musterfirma AG');
  } else {
    console.log('ℹ️  Firmen existieren bereits für Verag');
  }

  console.log('\n🎉 Seeding abgeschlossen!\n');
  console.log('📋 Login-Daten:');
  console.log('   Verag: http://verag.localhost:3000 → test / test123');
  console.log('   DSV: http://dsv.localhost:3000 → dsvtest / test123');
  console.log('   Admin: http://admin.localhost:3000 → admin / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

