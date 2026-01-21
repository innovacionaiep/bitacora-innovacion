import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateObjetivosIndicadoresRandom() {
  console.log('🔄 Actualizando objetivos específicos e indicadores de manera aleatoria...');

  try {
    // Obtener todos los proyectos
    const proyectos = await prisma.proyecto.findMany({
      include: {
        objetivos_rel: {
          where: { tipo: 'Especifico' },
          include: {
            indicadores: true
          }
        }
      }
    });

    if (proyectos.length === 0) {
      console.log('No hay proyectos para actualizar');
      return;
    }

    // Plantilla de objetivos específicos variados
    const objetivosEspecificosTemplates = [
      (nombreProyecto: string) => `Identificar y analizar las necesidades específicas del sector objetivo para el proyecto ${nombreProyecto}.`,
      (nombreProyecto: string) => `Implementar las soluciones propuestas con metodologías participativas y enfoque en resultados medibles.`,
      (nombreProyecto: string) => `Capacitar a los beneficiarios en el uso y mantenimiento de las soluciones implementadas.`,
      (nombreProyecto: string) => `Desarrollar estrategias de difusión y comunicación para maximizar el impacto del proyecto ${nombreProyecto}.`,
      (nombreProyecto: string) => `Establecer alianzas estratégicas con actores clave del sector para fortalecer la sostenibilidad del proyecto.`,
      (nombreProyecto: string) => `Evaluar y monitorear continuamente el progreso y los resultados del proyecto ${nombreProyecto}.`,
      (nombreProyecto: string) => `Fortalecer las capacidades técnicas y organizacionales de los participantes del proyecto.`,
      (nombreProyecto: string) => `Generar evidencia y documentación que permita replicar y escalar las soluciones implementadas.`
    ];

    // Plantilla de indicadores genéricos
    const indicadoresTemplates = [
      {
        nombre: "Porcentaje de cumplimiento del objetivo",
        descripcion: "Mide el nivel de cumplimiento del objetivo específico en términos porcentuales. Este indicador permite evaluar el avance hacia la meta establecida.",
        formaCalculo: "(Resultado alcanzado / Resultado esperado) * 100",
        resultadoEsperado: "80%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Número de beneficiarios alcanzados",
        descripcion: "Cantidad total de personas o entidades que se han beneficiado directamente de las actividades del proyecto relacionadas con este objetivo.",
        formaCalculo: "Suma total de beneficiarios registrados",
        resultadoEsperado: "50",
        resultadoAlcanzado: "0",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Nivel de satisfacción de participantes",
        descripcion: "Mide el grado de satisfacción de los participantes con las actividades realizadas en el marco del objetivo específico.",
        formaCalculo: "Promedio de calificaciones en encuesta de satisfacción (escala 1-5)",
        resultadoEsperado: "4.0",
        resultadoAlcanzado: "0",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Porcentaje de actividades completadas",
        descripcion: "Indica el porcentaje de actividades planificadas para este objetivo que han sido completadas exitosamente.",
        formaCalculo: "(N° actividades completadas / N° actividades planificadas) * 100",
        resultadoEsperado: "100%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Impacto medible del objetivo",
        descripcion: "Evalúa el impacto cuantificable generado por la consecución de este objetivo específico en la población objetivo.",
        formaCalculo: "Métrica específica según el tipo de impacto (número, porcentaje, índice, etc.)",
        resultadoEsperado: "75%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Tasa de participación en actividades",
        descripcion: "Mide el porcentaje de participación efectiva en las actividades relacionadas con este objetivo específico.",
        formaCalculo: "(N° participantes activos / N° participantes esperados) * 100",
        resultadoEsperado: "85%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "Número de productos o entregables generados",
        descripcion: "Cuenta la cantidad de productos, entregables o resultados tangibles generados en el marco de este objetivo específico.",
        formaCalculo: "Suma total de productos/entregables completados",
        resultadoEsperado: "10",
        resultadoAlcanzado: "0",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      }
    ];

    let proyectosActualizados = 0;
    let totalObjetivosCreados = 0;
    let totalIndicadoresCreados = 0;

    for (const proyecto of proyectos) {
      console.log(`\n📁 Procesando proyecto: ${proyecto.proyecto}`);

      // Eliminar objetivos específicos existentes y sus indicadores
      const objetivosEspecificosExistentes = proyecto.objetivos_rel;

      for (const objetivo of objetivosEspecificosExistentes) {
        // Eliminar indicadores del objetivo
        await prisma.indicador.deleteMany({
          where: { objetivoEspecificoId: objetivo.id }
        });
      }

      // Eliminar objetivos específicos
      await prisma.objetivoProyecto.deleteMany({
        where: {
          proyectoId: proyecto.id,
          tipo: 'Especifico'
        }
      });

      // Generar entre 3 y 4 objetivos específicos aleatorios
      const numObjetivosEspecificos = Math.floor(Math.random() * 2) + 3; // 3 o 4 objetivos
      const templatesDisponibles = [...objetivosEspecificosTemplates];
      const templatesSeleccionados = templatesDisponibles
        .sort(() => 0.5 - Math.random())
        .slice(0, numObjetivosEspecificos);

      // Crear los objetivos específicos seleccionados
      const objetivosEspecificosData = templatesSeleccionados.map((template, index) => ({
        proyectoId: proyecto.id,
        tipo: 'Especifico' as const,
        descripcion: template(proyecto.proyecto),
        orden: index + 1
      }));

      const resultadoObjetivos = await prisma.objetivoProyecto.createMany({
        data: objetivosEspecificosData
      });

      totalObjetivosCreados += resultadoObjetivos.count;
      console.log(`   ✅ ${resultadoObjetivos.count} objetivo(s) específico(s) creado(s)`);

      // Obtener los objetivos específicos recién creados para asignarles indicadores
      const objetivosRecienCreados = await prisma.objetivoProyecto.findMany({
        where: {
          proyectoId: proyecto.id,
          tipo: 'Especifico'
        },
        orderBy: { orden: 'asc' }
      });

      // Crear indicadores para cada objetivo específico
      for (const objetivo of objetivosRecienCreados) {
        // Generar entre 1 y 2 indicadores aleatorios por objetivo específico
        const numIndicadores = Math.floor(Math.random() * 2) + 1; // 1 o 2 indicadores

        // Seleccionar templates aleatorios para los indicadores
        const templatesIndicadoresDisponibles = [...indicadoresTemplates];
        const templatesIndicadoresSeleccionados = templatesIndicadoresDisponibles
          .sort(() => 0.5 - Math.random())
          .slice(0, numIndicadores);

        // Crear los indicadores seleccionados
        let indicadoresEnObjetivo = 0;
        for (const indicadorTemplate of templatesIndicadoresSeleccionados) {
          await prisma.indicador.create({
            data: {
              proyectoId: proyecto.id,
              objetivoEspecificoId: objetivo.id,
              nombre: indicadorTemplate.nombre,
              descripcion: indicadorTemplate.descripcion,
              formaCalculo: indicadorTemplate.formaCalculo,
              resultadoEsperado: indicadorTemplate.resultadoEsperado,
              resultadoAlcanzado: indicadorTemplate.resultadoAlcanzado,
              porcentajeCumplimiento: indicadorTemplate.porcentajeCumplimiento,
              porcentajeAvance: indicadorTemplate.porcentajeAvance
            }
          });

          indicadoresEnObjetivo++;
          totalIndicadoresCreados++;
        }
      }

      console.log(`   ✅ Indicadores creados para este proyecto`);
      proyectosActualizados++;
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Proyectos actualizados: ${proyectosActualizados}`);
    console.log(`   ✅ Objetivos específicos creados: ${totalObjetivosCreados}`);
    console.log(`   ✅ Indicadores creados: ${totalIndicadoresCreados}`);
    console.log(`\n✅ Proceso completado exitosamente`);

  } catch (error) {
    console.error('❌ Error actualizando objetivos e indicadores:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  updateObjetivosIndicadoresRandom()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { updateObjetivosIndicadoresRandom };
