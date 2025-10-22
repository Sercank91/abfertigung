import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Erstelle Test-Tenant (Firma)
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'test-firma' },
    update: {},
    create: {
      name: 'Test Spedition GmbH',
      domain: 'test-firma',
    },
  })

  console.log('✅ Tenant erstellt:', tenant.name)

  // Erstelle Test-User
  const hashedPassword = await bcrypt.hash('test123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'Test Admin',
      password: hashedPassword,
      role: 'admin',
      tenantId: tenant.id,
    },
  })

  console.log('✅ User erstellt:', user.email)

  // Erstelle Test-Mitarbeiter
  const employee = await prisma.employee.create({
    data: {
      firstName: 'Max',
      lastName: 'Mustermann',
      startDate: new Date('2020-01-01'),
      monthlyGross: 3500,
      tenantId: tenant.id,
    },
  })

  console.log('✅ Mitarbeiter erstellt:', employee.firstName, employee.lastName)

  console.log('🎉 Seeding abgeschlossen!')
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })