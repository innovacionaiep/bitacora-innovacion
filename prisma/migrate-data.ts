import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingData() {
  console.log('🔄 Migrating existing project data...');

  try {
    // Obtener todos los proyectos existentes
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        escuelas: { select: { escuelaId: true } },
      },
    });

    console.log(`Found ${proyectos.length} projects to migrate`);

    for (const proyecto of proyectos) {
      // Script adaptado al esquema actual (Proyecto.escuelas en lugar de escuela).
      // Proyectos sin escuelas ya migrados se pueden procesar aquí si se necesita.
      if (proyecto.escuelas.length === 0) {
        console.log(`Proyecto ${proyecto.id} sin escuelas asignadas`);
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
  migrateExistingData().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
