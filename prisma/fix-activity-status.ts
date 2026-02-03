import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_STATUSES = ['TODO', 'WAITING', 'IN_PROGRESS', 'DONE'];

async function fixActivityStatus() {
  console.log('🔍 Buscando actividades con status inválidos...\n');

  // Obtener todas las actividades
  const allActivities = await prisma.activity.findMany({
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  console.log(`📊 Total de actividades encontradas: ${allActivities.length}\n`);

  // Filtrar actividades con status inválidos
  const invalidActivities = allActivities.filter(
    (activity) => !VALID_STATUSES.includes(activity.status)
  );

  if (invalidActivities.length === 0) {
    console.log('✅ No se encontraron actividades con status inválidos.');
    return;
  }

  console.log(
    `❌ Actividades con status inválidos: ${invalidActivities.length}\n`
  );
  console.log('Detalles:');
  invalidActivities.forEach((activity, index) => {
    console.log(`  ${index + 1}. ${activity.name}`);
    console.log(`     ID: ${activity.id}`);
    console.log(`     Status inválido: ${activity.status}\n`);
  });

  // Actualizar actividades con status inválidos a 'TODO'
  console.log('🔧 Actualizando actividades a status "TODO"...\n');

  const updatePromises = invalidActivities.map((activity) =>
    prisma.activity.update({
      where: { id: activity.id },
      data: { status: 'TODO' },
    })
  );

  await Promise.all(updatePromises);

  console.log('✅ Todas las actividades han sido actualizadas exitosamente!\n');
  console.log('Resumen:');
  console.log(`  - Total de actividades: ${allActivities.length}`);
  console.log(`  - Actividades corregidas: ${invalidActivities.length}`);
  console.log(
    `  - Actividades correctas: ${allActivities.length - invalidActivities.length}`
  );
}

fixActivityStatus()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando el script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
