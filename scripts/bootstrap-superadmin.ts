import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bootstrap Super-Admin...');

  const username = process.env.SUPER_ADMIN_USERNAME || 'admin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@abfertigung.io';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';
  const firstName = process.env.SUPER_ADMIN_FIRSTNAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LASTNAME || 'Admin';

  // Prüfe ob Super-Admin bereits existiert
  const existing = await prisma.superAdmin.findUnique({
    where: { username }
  });

  if (existing) {
    console.log(`✅ Super-Admin "${username}" existiert bereits.`);
    return;
  }

  // Hash das Passwort
  const hashedPassword = await bcrypt.hash(password, 10);

  // Erstelle Super-Admin
  const superAdmin = await prisma.superAdmin.create({
    data: {
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true
    }
  });

  console.log(`✅ Super-Admin erstellt:`);
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
  console.log(`\n🔐 Login-Daten (nur einmalig angezeigt):`);
  console.log(`   URL: http://admin.localhost:3000`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  WICHTIG: Ändere das Passwort nach dem ersten Login!`);
}

main()
  .catch((e) => {
    console.error('❌ Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

