import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

async function main() {
  console.log('🌱 Starte Seed...')

  // Verag Tenant
  const verag = await prisma.tenant.upsert({
    where: { domain: 'verag' },
    update: {},
    create: {
      name: 'Verag Spedition GmbH',
      domain: 'verag',
    },
  })
  console.log('✅ Tenant erstellt: Verag')

  // DSV Tenant
  const dsv = await prisma.tenant.upsert({
    where: { domain: 'dsv' },
    update: {},
    create: {
      name: 'DSV Spedition GmbH',
      domain: 'dsv',
    },
  })
  console.log('✅ Tenant erstellt: DSV')

  // ===== VERAG USERS =====
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: await hashPassword('admin123')
    },
    create: {
      username: 'admin',
      email: 'admin@verag.com',
      password: await hashPassword('admin123'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      tenantId: verag.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: admin (Verag)')

  await prisma.user.upsert({
    where: { username: 'schichtleiter' },
    update: {
      password: await hashPassword('schicht123')
    },
    create: {
      username: 'schichtleiter',
      email: 'schichtleiter@verag.com',
      password: await hashPassword('schicht123'),
      firstName: 'Max',
      lastName: 'Mustermann',
      phone: '+43123456789',
      role: 'schichtleiter',
      tenantId: verag.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: schichtleiter (Verag)')

  await prisma.user.upsert({
    where: { username: 'sercan' },
    update: {
      password: await hashPassword('sercan123')
    },
    create: {
      username: 'sercan',
      email: 'sercan@verag.com',
      password: await hashPassword('sercan123'),
      firstName: 'Sercan',
      lastName: 'Karagöz',
      phone: '+43987654321',
      role: 'mitarbeiter',
      tenantId: verag.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: sercan (Verag)')

  await prisma.user.upsert({
    where: { username: 'skaragoz' },
    update: {
      password: await hashPassword('skaragoz123')
    },
    create: {
      username: 'skaragoz',
      email: 'serkan@verag.com',
      password: await hashPassword('skaragoz123'),
      firstName: 'Serkan',
      lastName: 'Karagöz',
      phone: '+43660635055',
      role: 'schichtleiter',
      tenantId: verag.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: skaragoz (Verag)')

  // ===== DSV USERS =====

  await prisma.user.upsert({
    where: { username: 'dsv-admin' },
    update: {
      password: await hashPassword('dsv123')
    },
    create: {
      username: 'dsv-admin',
      email: 'admin@dsv.com',
      password: await hashPassword('dsv123'),
      firstName: 'DSV',
      lastName: 'Admin',
      role: 'admin',
      tenantId: dsv.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: dsv-admin (DSV)')

  await prisma.user.upsert({
    where: { username: 'dsv-schichtleiter' },
    update: {
      password: await hashPassword('dsv-schicht123')
    },
    create: {
      username: 'dsv-schichtleiter',
      email: 'schichtleiter@dsv.com',
      password: await hashPassword('dsv-schicht123'),
      firstName: 'Thomas',
      lastName: 'Müller',
      phone: '+43234567890',
      role: 'schichtleiter',
      tenantId: dsv.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: dsv-schichtleiter (DSV)')

  await prisma.user.upsert({
    where: { username: 'dsv-mitarbeiter' },
    update: {
      password: await hashPassword('dsv-mit123')
    },
    create: {
      username: 'dsv-mitarbeiter',
      email: 'mitarbeiter@dsv.com',
      password: await hashPassword('dsv-mit123'),
      firstName: 'Michael',
      lastName: 'Schmidt',
      phone: '+43345678901',
      role: 'mitarbeiter',
      tenantId: dsv.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: dsv-mitarbeiter (DSV)')

  await prisma.user.upsert({
    where: { username: 'ahmet' },
    update: {
      password: await hashPassword('ahmet123')
    },
    create: {
      username: 'ahmet',
      email: 'ahmet@dsv.com',
      password: await hashPassword('ahmet123'),
      firstName: 'Ahmet',
      lastName: 'Ak',
      phone: '+43660635304052',
      role: 'schichtleiter',
      tenantId: dsv.id,
    },
  })
  console.log('✅ User erstellt/aktualisiert: ahmet (DSV)')

  console.log('')
  console.log('🎉 Seed erfolgreich abgeschlossen!')
  console.log('')
  console.log('📋 Test-User für Verag:')
  console.log('   Admin:         username: admin          | password: admin123')
  console.log('   Schichtleiter: username: schichtleiter  | password: schicht123')
  console.log('   Schichtleiter: username: skaragoz       | password: skaragoz123')
  console.log('   Mitarbeiter:   username: sercan         | password: sercan123')
  console.log('')
  console.log('📋 Test-User für DSV:')
  console.log('   Admin:         username: dsv-admin           | password: dsv123')
  console.log('   Schichtleiter: username: dsv-schichtleiter  | password: dsv-schicht123')
  console.log('   Schichtleiter: username: ahmet              | password: ahmet123')
  console.log('   Mitarbeiter:   username: dsv-mitarbeiter    | password: dsv-mit123')
  console.log('')
  console.log('🔐 Alle Passwörter sind jetzt mit bcrypt gehasht!')
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })