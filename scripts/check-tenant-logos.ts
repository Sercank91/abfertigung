import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Prüfe Tenant-Logos...\n')

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      domain: true,
      logoUrl: true,
      status: true
    }
  })

  tenants.forEach(tenant => {
    console.log(`📦 ${tenant.name} (${tenant.domain})`)
    console.log(`   Status: ${tenant.status}`)
    console.log(`   Logo: ${tenant.logoUrl || '❌ KEIN LOGO'}`)
    console.log('')
  })
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

