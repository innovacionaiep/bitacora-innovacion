import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFechasIndicadores() {
  console.log('🌱 Iniciando seed de fechas para indicadores...');

  try {
    // Obtener todos los proyectos con sus actividades y tareas
    const proyectos = await prisma.proyecto.findMany({
      include: {
        activities: {
          include: {
            tasks: true,
          },
        },
        indicadores: true,
      },
    });

    let indicadoresActualizados = 0;

    for (const proyecto of proyectos) {
      // Obtener todas las fechas de inicio y fin de las tareas del proyecto
      const todasLasFechas: string[] = [];

      proyecto.activities.forEach((activity) => {
        activity.tasks.forEach((task) => {
          if (task.startDate) todasLasFechas.push(task.startDate);
          if (task.endDate) todasLasFechas.push(task.endDate);
        });
      });

      if (todasLasFechas.length === 0) {
        console.log(
          `⚠️  Proyecto ${proyecto.proyecto} no tiene tareas con fechas. Usando fechas por defecto.`
        );
        // Si no hay fechas, usar el createdAt del proyecto como referencia
        const fechaInicioProyecto = new Date(proyecto.createdAt);
        const fechaFinProyecto = new Date(fechaInicioProyecto);
        fechaFinProyecto.setMonth(fechaFinProyecto.getMonth() + 12); // 12 meses después

        // Asignar fechas aleatorias a cada indicador
        for (const indicador of proyecto.indicadores) {
          if (!indicador.fechaInicio || !indicador.fechaFin) {
            // Generar fechas aleatorias dentro del rango del proyecto
            const diasProyecto = Math.floor(
              (fechaFinProyecto.getTime() - fechaInicioProyecto.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const diasInicio = Math.floor(Math.random() * (diasProyecto * 0.7)); // Inicio en los primeros 70% del proyecto
            const duracionIndicador =
              Math.floor(Math.random() * (diasProyecto * 0.3)) + 30; // Duración entre 30 días y 30% del proyecto

            const fechaInicio = new Date(fechaInicioProyecto);
            fechaInicio.setDate(fechaInicio.getDate() + diasInicio);

            const fechaFin = new Date(fechaInicio);
            fechaFin.setDate(fechaFin.getDate() + duracionIndicador);

            await prisma.indicador.update({
              where: { id: indicador.id },
              data: {
                fechaInicio: fechaInicio.toISOString().split('T')[0],
                fechaFin: fechaFin.toISOString().split('T')[0],
              },
            });

            indicadoresActualizados++;
          }
        }
        continue;
      }

      // Ordenar fechas y obtener el rango
      const fechasOrdenadas = todasLasFechas
        .map((f) => new Date(f))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (fechasOrdenadas.length === 0) {
        console.log(
          `⚠️  Proyecto ${proyecto.proyecto} no tiene fechas válidas.`
        );
        continue;
      }

      const fechaInicioProyecto = fechasOrdenadas[0];
      const fechaFinProyecto = fechasOrdenadas[fechasOrdenadas.length - 1];

      // Calcular duración del proyecto en días
      const diasProyecto = Math.floor(
        (fechaFinProyecto.getTime() - fechaInicioProyecto.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (diasProyecto <= 0) {
        console.log(
          `⚠️  Proyecto ${proyecto.proyecto} tiene rango de fechas inválido.`
        );
        continue;
      }

      // Asignar fechas aleatorias a cada indicador
      for (const indicador of proyecto.indicadores) {
        if (!indicador.fechaInicio || !indicador.fechaFin) {
          // Generar fechas aleatorias dentro del rango del proyecto
          // El inicio puede estar en los primeros 80% del proyecto
          const diasInicio = Math.floor(Math.random() * (diasProyecto * 0.8));
          // La duración del indicador puede ser entre 30 días y 40% de la duración del proyecto
          const duracionIndicador =
            Math.floor(Math.random() * (diasProyecto * 0.4)) + 30;

          const fechaInicio = new Date(fechaInicioProyecto);
          fechaInicio.setDate(fechaInicio.getDate() + diasInicio);

          const fechaFin = new Date(fechaInicio);
          fechaFin.setDate(fechaFin.getDate() + duracionIndicador);

          // Asegurar que la fecha fin no exceda la fecha fin del proyecto
          if (fechaFin > fechaFinProyecto) {
            fechaFin.setTime(fechaFinProyecto.getTime());
          }

          await prisma.indicador.update({
            where: { id: indicador.id },
            data: {
              fechaInicio: fechaInicio.toISOString().split('T')[0],
              fechaFin: fechaFin.toISOString().split('T')[0],
            },
          });

          indicadoresActualizados++;
        }
      }

      console.log(
        `✅ Proyecto ${proyecto.proyecto}: ${proyecto.indicadores.length} indicadores procesados`
      );
    }

    console.log(
      `\n✨ Seed completado: ${indicadoresActualizados} indicadores actualizados con fechas`
    );
  } catch (error) {
    console.error('❌ Error en seed de fechas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
seedFechasIndicadores().catch((error) => {
  console.error(error);
  process.exit(1);
});
