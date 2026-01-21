import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignIndicadoresToAllProjects() {
  console.log('🌱 Asignando indicadores a todos los proyectos...');

  try {
    // Get all projects with their objectives and existing indicators
    const proyectos = await prisma.proyecto.findMany({
      include: {
        objetivos_rel: {
          where: { tipo: 'Especifico' },
          orderBy: { orden: 'asc' },
          include: {
            indicadores: true
          }
        }
      }
    });

    if (proyectos.length === 0) {
      console.log('No hay proyectos para asignar indicadores');
      return;
    }

    // Plantilla de indicadores genéricos que se pueden adaptar
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
      }
    ];

    let indicadoresCreados = 0;
    let proyectosProcesados = 0;
    let proyectosSinObjetivos = 0;
    let proyectosConIndicadores = 0;

    for (const proyecto of proyectos) {
      if (proyecto.objetivos_rel.length === 0) {
        console.log(`⚠️  Proyecto "${proyecto.proyecto}" no tiene objetivos específicos, saltando...`);
        proyectosSinObjetivos++;
        continue;
      }

      let proyectoTieneIndicadores = false;
      let indicadoresEnProyecto = 0;

      // Verificar si el proyecto ya tiene indicadores
      const tieneIndicadores = proyecto.objetivos_rel.some(obj => obj.indicadores.length > 0);

      if (tieneIndicadores) {
        console.log(`ℹ️  Proyecto "${proyecto.proyecto}" ya tiene indicadores, verificando objetivos sin indicadores...`);
        proyectosConIndicadores++;
      }

      // Crear indicadores para cada objetivo específico que no tenga indicadores
      for (const objetivo of proyecto.objetivos_rel) {
        // Si el objetivo ya tiene indicadores, saltarlo
        if (objetivo.indicadores.length > 0) {
          continue;
        }

        // Generar entre 1 y 2 indicadores aleatorios por objetivo específico
        const numIndicadores = Math.floor(Math.random() * 2) + 1; // 1 o 2 indicadores

        // Seleccionar templates aleatorios para los indicadores
        const templatesDisponibles = [...indicadoresTemplates];
        const templatesSeleccionados = templatesDisponibles
          .sort(() => 0.5 - Math.random())
          .slice(0, numIndicadores);

        // Crear los indicadores seleccionados
        for (const indicadorTemplate of templatesSeleccionados) {
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

          indicadoresEnProyecto++;
          indicadoresCreados++;
          proyectoTieneIndicadores = true;
        }
      }

      if (proyectoTieneIndicadores) {
        proyectosProcesados++;
        console.log(`✅ Proyecto "${proyecto.proyecto}": ${indicadoresEnProyecto} indicador(es) creado(s)`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Proyectos procesados: ${proyectosProcesados}`);
    console.log(`   ✅ Indicadores creados: ${indicadoresCreados}`);
    console.log(`   ⚠️  Proyectos sin objetivos específicos: ${proyectosSinObjetivos}`);
    console.log(`   ℹ️  Proyectos que ya tenían indicadores: ${proyectosConIndicadores}`);
    console.log(`\n✅ Proceso completado exitosamente`);

  } catch (error) {
    console.error('❌ Error asignando indicadores:', error);
    throw error;
  }
}

async function main() {
  await assignIndicadoresToAllProjects();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
