import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🔧 Aplicando migración para convertir status a enum...\n');

  try {
    // Paso 1: Crear el enum
    console.log('1️⃣ Creando enum ActivityStatus...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "ActivityStatus" AS ENUM ('TODO', 'WAITING', 'IN_PROGRESS', 'DONE');
      `);
      console.log('✅ Enum creado\n');
    } catch (error: any) {
      if (error.meta?.message?.includes('already exists')) {
        console.log('⚠️ El enum ya existe, continuando...\n');
      } else {
        throw error;
      }
    }

    // Paso 2: Remover el default
    console.log('2️⃣ Removiendo default de la columna...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "activities" ALTER COLUMN "status" DROP DEFAULT;
    `);
    console.log('✅ Default removido\n');

    // Paso 3: Convertir la columna
    console.log('3️⃣ Convirtiendo columna status a tipo enum...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "activities" ALTER COLUMN "status" TYPE "ActivityStatus" USING (status::"ActivityStatus");
    `);
    console.log('✅ Columna convertida\n');

    // Paso 4: Establecer el default
    console.log('4️⃣ Estableciendo valor por defecto...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'TODO'::"ActivityStatus";
    `);
    console.log('✅ Default establecido\n');

    console.log('✅ Migración aplicada exitosamente!\n');
  } catch (error: any) {
    console.error('❌ Error aplicando la migración:', error);
    throw error;
  }
}

applyMigration()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando el script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
