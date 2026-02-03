import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAX_NAME_LENGTH = 62;

async function fixTaskNames() {
  console.log('🔍 Validando nombres de tareas...\n');

  // Obtener todas las tareas
  const allTasks = await prisma.task.findMany({
    select: {
      id: true,
      name: true,
      activityId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📊 Total de tareas encontradas: ${allTasks.length}\n`);

  // Filtrar tareas con nombres que exceden 64 caracteres
  const tasksWithLongNames = allTasks.filter(
    (task) => task.name.length > MAX_NAME_LENGTH
  );

  if (tasksWithLongNames.length === 0) {
    console.log(
      `✅ Todas las tareas tienen nombres válidos (máximo ${MAX_NAME_LENGTH} caracteres).`
    );
    return;
  }

  console.log(
    `❌ Tareas con nombres que exceden ${MAX_NAME_LENGTH} caracteres (incluyendo espacios): ${tasksWithLongNames.length}\n`
  );
  console.log('Detalles de las tareas a actualizar:');
  tasksWithLongNames.forEach((task, index) => {
    console.log(`  ${index + 1}. ID: ${task.id}`);
    console.log(
      `     Nombre actual (${task.name.length} caracteres): "${task.name}"`
    );
    console.log(
      `     Nombre truncado: "${task.name.substring(0, MAX_NAME_LENGTH)}"\n`
    );
  });

  // Actualizar tareas con nombres truncados
  console.log(
    `🔧 Actualizando ${tasksWithLongNames.length} tarea(s) con nombres truncados...\n`
  );

  const updatePromises = tasksWithLongNames.map((task) =>
    prisma.task.update({
      where: { id: task.id },
      data: {
        name: task.name.substring(0, MAX_NAME_LENGTH),
      },
    })
  );

  await Promise.all(updatePromises);

  console.log('✅ Todas las tareas han sido actualizadas exitosamente!\n');
  console.log('Resumen:');
  console.log(`  - Total de tareas: ${allTasks.length}`);
  console.log(`  - Tareas actualizadas: ${tasksWithLongNames.length}`);
  console.log(
    `  - Tareas correctas: ${allTasks.length - tasksWithLongNames.length}`
  );
}

fixTaskNames()
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
