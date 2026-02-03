import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cargosEstudiante = [
  'Diseñador',
  'Consultor',
  'Encargado de encuestas',
  'Ilustrador',
  'Desarrollador',
  'Investigador',
];

async function migrarParticipantesAntiguos() {
  try {
    console.log('🔄 Buscando participantes con rol antiguo "Participante"...');
    const participantes = await prisma.proyectoParticipante.findMany({
      where: {
        rol: 'Participante',
      },
    });

    if (participantes.length === 0) {
      console.log('✅ No hay participantes con rol antiguo');
      return;
    }

    console.log(
      `📋 Encontrados ${participantes.length} participantes con rol antiguo`
    );

    for (const participante of participantes) {
      const cargoAleatorio =
        cargosEstudiante[Math.floor(Math.random() * cargosEstudiante.length)];

      await prisma.proyectoParticipante.update({
        where: { id: participante.id },
        data: {
          rol: 'Estudiante',
          cargo: cargoAleatorio,
        },
      });

      console.log(
        `  ✅ Actualizado: ${participante.id} -> Estudiante (${cargoAleatorio})`
      );
    }

    console.log('\n✨ ¡Migración completada exitosamente!');
  } catch (error) {
    console.error('❌ Error al migrar participantes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
migrarParticipantesAntiguos().catch((error) => {
  console.error(error);
  process.exit(1);
});
