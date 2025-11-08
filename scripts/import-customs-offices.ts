import { transliterate } from '../src/lib/transliterate';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as path from 'path';

const prisma = new PrismaClient();

async function importCustomsOffices() {
  console.log('🚀 Starting Customs Offices Import...\n');

  const xmlPath = path.join(__dirname, '../customs_offices/customs_offices.xml');
  
  if (!fs.existsSync(xmlPath)) {
    console.error('❌ XML file not found at:', xmlPath);
    process.exit(1);
  }

  console.log('📄 Reading XML file...');
  const xmlData = fs.readFileSync(xmlPath, 'utf-8');

  console.log('🔍 Parsing XML...');
  const parser = new xml2js.Parser({
    explicitArray: true,
    mergeAttrs: false,
    ignoreAttrs: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
  });

  const result = await parser.parseStringPromise(xmlData);
  
  console.log('🔍 Looking for CustomsOffices entity...');
  
  const rdEntityList = result?.RDEntityList;
  if (!rdEntityList || !rdEntityList.RDEntity) {
    console.error('❌ No RDEntity found in XML');
    process.exit(1);
  }

  // Finde CustomsOffices Entity
  let customsOfficesEntity = null;
  for (const entity of rdEntityList.RDEntity) {
    const entityName = entity.$?.name || entity.name;
    console.log(`   Found entity: ${entityName}`);
    
    if (entityName === 'CustomsOffices' || entityName === 'CustomsOfficesList') {
      customsOfficesEntity = entity;
      console.log('✅ Found CustomsOffices entity!\n');
      break;
    }
  }

  if (!customsOfficesEntity) {
    console.error('❌ CustomsOffices entity not found');
    console.log('\nAvailable entities:');
    rdEntityList.RDEntity.forEach((e: any) => {
      console.log(`  - ${e.$?.name || e.name || 'unknown'}`);
    });
    process.exit(1);
  }

  const entries = customsOfficesEntity.RDEntry || [];
  console.log(`✅ Found ${entries.length} customs office entries\n`);
  console.log('📥 Importing to database...\n');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    try {
      // Parse dataItems
      const dataItems: Record<string, string> = {};
      if (entry.dataItem) {
        for (const item of entry.dataItem) {
          const name = item.$?.name;
          const value = item._;
          if (name && value) {
            dataItems[name] = value;
          }
        }
      }

      const code = dataItems.ReferenceNumber;
      const countryCode = dataItems.CountryCode;
      
      if (!code || !countryCode) {
        skipped++;
        continue;
      }

      // Parse CustomsOfficeLsd dataGroup für Name, City, Address
      let name = code; // Fallback
      let city = null;
      let address = null;

      if (entry.dataGroup) {
        for (const group of entry.dataGroup) {
          const groupName = group.$?.name;
          if (groupName === 'CustomsOfficeLsd' && group.dataItem) {
            const lsdItems: Record<string, string> = {};
            for (const item of group.dataItem) {
              const itemName = item.$?.name;
              const itemValue = item._;
              if (itemName && itemValue) {
                lsdItems[itemName] = itemValue;
              }
            }
            
            // Extrahiere Name, City, Address
            if (lsdItems.CustomsOfficeUsualName) {
              name = lsdItems.CustomsOfficeUsualName;
            }
            if (lsdItems.City) {
              city = lsdItems.City;
            }
            if (lsdItems.StreetAndNumber) {
              address = lsdItems.StreetAndNumber;
            }
            break; // Nur erste LSD-Gruppe nehmen
          }
        }
      }

// Erstelle Suchtext (transliteriert + original)
const searchText = [
    code,
    name,
    transliterate(name),
    city || '',
    transliterate(city || ''),
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Import in DB
  await prisma.customsOffice.upsert({
    where: { code },
    update: {
      name,
      countryCode,
      city,
      address,
      searchText,
    },
    create: {
      code,
      name,
      countryCode,
      city,
      address,
      searchText,
      isActive: true,
    },
  });

  imported++;

  // Progress
  if (imported % 100 === 0) {
    process.stdout.write(`\r✅ Imported: ${imported} | ⏭️ Skipped: ${skipped} | ❌ Errors: ${errors}`);
  }
    } catch (error) {
      errors++;
      if (errors < 5) {
        console.error(`\n❌ Error:`, error);
      }
    }
  }

  console.log(`\n\n🎉 Import completed!`);
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`⏭️ Skipped (missing data): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Zeige Beispiele
  console.log('\n📋 Sample entries:');
  const samples = await prisma.customsOffice.findMany({
    where: { countryCode: { in: ['DE', 'AT', 'TR'] } },
    take: 10,
    orderBy: { code: 'asc' },
  });
  samples.forEach(office => {
    console.log(`   ${office.code} - ${office.name} (${office.city || 'N/A'})`);
  });
  
  // Statistik
  console.log('\n📊 Statistics by country:');
  const stats = await prisma.customsOffice.groupBy({
    by: ['countryCode'],
    _count: true,
    orderBy: { countryCode: 'asc' },
  });
  stats.slice(0, 20).forEach(stat => {
    console.log(`   ${stat.countryCode}: ${stat._count} offices`);
  });
  
  await prisma.$disconnect();
}

importCustomsOffices()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });