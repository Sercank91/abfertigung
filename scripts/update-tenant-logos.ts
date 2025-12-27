import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Aktualisiere Tenant-Logos...')

  // Verag Logo
  await prisma.tenant.update({
    where: { domain: 'verag' },
    data: {
      logoUrl: 'https://verag.ag/templates/ut_lawstudio/images/presets/preset1/logo.svg'
    }
  })
  console.log('✅ Verag Logo aktualisiert')

  // DSV Logo
  await prisma.tenant.update({
    where: { domain: 'dsv' },
    data: {
      logoUrl: 'https://dsv-media-premium.azureedge.net/~/media/corporate/global/logo/dsv-logo-small.svg?iar=0&rev=391728928e824eef9247d3d041620943'
    }
  })
  console.log('✅ DSV Logo aktualisiert')

  // Atilla Tenant erstellen oder aktualisieren
  const atilla = await prisma.tenant.upsert({
    where: { domain: 'atilla' },
    update: {
      logoUrl: 'https://www.atillaspedition.at/wp-content/uploads/2022/03/atilla-logo-300x88.png'
    },
    create: {
      name: 'Atilla Spedition GmbH',
      domain: 'atilla',
      logoUrl: 'https://www.atillaspedition.at/wp-content/uploads/2022/03/atilla-logo-300x88.png',
      status: 'active'
    }
  })
  console.log('✅ Atilla Tenant erstellt/aktualisiert')

  // Atilla Admin User erstellen falls noch nicht vorhanden
  try {
    const bcrypt = await import('bcryptjs')
    await prisma.user.upsert({
      where: { 
        tenantId_username: { 
          tenantId: atilla.id, 
          username: 'atilla-admin' 
        } 
      },
      update: {},
      create: {
        username: 'atilla-admin',
        email: 'admin@atilla.com',
        password: await bcrypt.hash('atilla123', 10),
        firstName: 'Atilla',
        lastName: 'Admin',
        role: 'admin',
        tenantId: atilla.id,
      }
    })
    console.log('✅ Atilla Admin User erstellt/aktualisiert')
  } catch (err) {
    console.log('ℹ️  Atilla Admin User existiert bereits')
  }

  console.log('')
  console.log('🎉 Logos erfolgreich aktualisiert!')
  console.log('')
  console.log('📋 Atilla Login:')
  console.log('   URL:      atilla.localhost:3000')
  console.log('   Username: atilla-admin')
  console.log('   Password: atilla123')
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Aktualisieren:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

