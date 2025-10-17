import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingData() {
  console.log('🔄 Migrating existing project data...');

  try {
    // Obtener todos los proyectos existentes
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        escuela: true,
      },
    });

    console.log(`Found ${proyectos.length} projects to migrate`);

    for (const proyecto of proyectos) {
      if (proyecto.escuela) {
        // Buscar la escuela correspondiente
        const escuela = await prisma.escuela.findFirst({
          where: {
            nombre: {
              contains: proyecto.escuela,
              mode: 'insensitive',
            },
          },
        });

        if (escuela) {
          // Crear la relación ProyectoEscuela
          await prisma.proyectoEscuela.create({
            data: {
              proyectoId: proyecto.id,
              escuelaId: escuela.id,
            },
          });
          console.log(`✅ Migrated project ${proyecto.id} to escuela ${escuela.nombre}`);
        } else {
          console.log(`⚠️  No matching escuela found for: ${proyecto.escuela}`);
        }
      }
    }

    console.log('✅ Data migration completed');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateExistingData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

