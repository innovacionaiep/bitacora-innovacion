import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedIndicadores() {
  console.log('🌱 Seeding indicadores...');

  try {
    // Get all projects
    const proyectos = await prisma.proyecto.findMany({
      include: {
        objetivos_rel: {
          where: { tipo: 'Especifico' },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (proyectos.length === 0) {
      console.log('No hay proyectos para crear indicadores');
      return;
    }

    // Sample indicators based on the Excel example
    const indicadoresData = [
      {
        nombre: "80% de encuestados con brechas digitales detectadas",
        descripcion: "Permite cuantificar el nivel de desconocimiento o necesidad formativa en herramientas digitales dentro de la comunidad haitiana. Es clave para diseñar capacitaciones pertinentes. Esperado: Al menos un 80% de las personas encuestadas manifiestan necesidades en alfabetización digital y uso de plataformas.",
        formaCalculo: "(N° de encuestados con brechas / Total encuestados) * 100",
        resultadoEsperado: "80%",
        resultadoAlcanzado: "120%",
        porcentajeCumplimiento: 150,
        porcentajeAvance: 100
      },
      {
        nombre: "Se compromete un 80% de satisfacción (profundizar según herramienta y método a aplicar)",
        descripcion: "Encuesta de satisfacción a los estudiantes con el proceso al cierre del proceso.",
        formaCalculo: "Encuesta de satisfacción a los estudiantes con el proceso al cierre del proceso.",
        resultadoEsperado: "80%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "85% de participación en talleres digitales",
        descripcion: "Mide la efectividad en la convocatoria y participación real de la comunidad haitiana en los talleres impartidos, reflejando interés y pertinencia. Esperado: Realizar al menos 4 talleres, con una asistencia efectiva de al menos 80% de inscritos en cada uno.",
        formaCalculo: "(N° asistentes talleres / N° inscritos) * 100",
        resultadoEsperado: "85%",
        resultadoAlcanzado: "0%",
        porcentajeCumplimiento: 0,
        porcentajeAvance: 0
      },
      {
        nombre: "90% de participantes completan el programa de capacitación",
        descripcion: "Indicador que mide la retención y finalización exitosa del programa de capacitación por parte de los participantes inscritos.",
        formaCalculo: "(N° participantes que completan / N° participantes inscritos) * 100",
        resultadoEsperado: "90%",
        resultadoAlcanzado: "45%",
        porcentajeCumplimiento: 50,
        porcentajeAvance: 50
      },
      {
        nombre: "100% de talleres implementados según cronograma",
        descripcion: "Mide el cumplimiento del cronograma establecido para la implementación de los talleres formativos.",
        formaCalculo: "(N° talleres realizados / N° talleres programados) * 100",
        resultadoEsperado: "100%",
        resultadoAlcanzado: "75%",
        porcentajeCumplimiento: 75,
        porcentajeAvance: 75
      }
    ];

    let indicadoresCreados = 0;

    for (const proyecto of proyectos) {
      if (proyecto.objetivos_rel.length === 0) {
        console.log(`Proyecto ${proyecto.proyecto} no tiene objetivos específicos, saltando...`);
        continue;
      }

      // Create indicators for each specific objective
      for (let i = 0; i < proyecto.objetivos_rel.length && i < indicadoresData.length; i++) {
        const objetivo = proyecto.objetivos_rel[i];
        const indicadorData = indicadoresData[i];

        await prisma.indicador.create({
          data: {
            proyectoId: proyecto.id,
            objetivoEspecificoId: objetivo.id,
            nombre: indicadorData.nombre,
            descripcion: indicadorData.descripcion,
            formaCalculo: indicadorData.formaCalculo,
            resultadoEsperado: indicadorData.resultadoEsperado,
            resultadoAlcanzado: indicadorData.resultadoAlcanzado,
            porcentajeCumplimiento: indicadorData.porcentajeCumplimiento,
            porcentajeAvance: indicadorData.porcentajeAvance
          }
        });

        indicadoresCreados++;
      }
    }

    console.log(`✅ ${indicadoresCreados} indicadores creados exitosamente`);

  } catch (error) {
    console.error('❌ Error seeding indicadores:', error);
    throw error;
  }
}

async function main() {
  await seedIndicadores();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

