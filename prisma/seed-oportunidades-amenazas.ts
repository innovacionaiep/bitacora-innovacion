/**
 * Seed de oportunidades y amenazas: crea 2 oportunidades y 2 amenazas por proyecto
 * con tipo, nombre, descripción y plan de acción.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPORTUNIDADES = [
  {
    nombre: 'Alianzas con instituciones educativas',
    descripcion:
      'Posibilidad de establecer convenios con universidades y centros de formación para prácticas, talleres conjuntos y difusión del proyecto.',
    planDeAccion:
      'Contactar a 3 instituciones en el primer trimestre; redactar propuesta de convenio; reunión de coordinación mensual.',
  },
  {
    nombre: 'Fondos concursables adicionales',
    descripcion:
      'Existencia de fondos regionales y sectoriales que complementan el financiamiento actual y permiten ampliar el alcance.',
    planDeAccion:
      'Revisar bases de fondos vigentes; asignar responsable de postulación; calendarizar fechas de cierre.',
  },
  {
    nombre: 'Visibilidad en redes y medios',
    descripcion:
      'Interés de medios locales y redes comunitarias por difundir iniciativas con impacto social y ambiental.',
    planDeAccion:
      'Elaborar kit de prensa; designar vocero; programar 2 apariciones en medios antes de mitad de proyecto.',
  },
  {
    nombre: 'Demanda creciente del sector',
    descripcion:
      'Aumento de la demanda de productos o servicios vinculados al objetivo del proyecto en el territorio.',
    planDeAccion:
      'Actualizar diagnóstico de demanda cada 4 meses; ajustar oferta según resultados; documentar testimonios.',
  },
];

const AMENAZAS = [
  {
    nombre: 'Cambios en plazos o recursos',
    descripcion:
      'Riesgo de retrasos en desembolsos o modificaciones de plazos por parte del financiador que afecten la ejecución.',
    planDeAccion:
      'Mantener reserva de actividades no críticas; comunicación formal con contraparte; informe de avance mensual.',
  },
  {
    nombre: 'Baja participación de beneficiarios',
    descripcion:
      'Riesgo de que la convocatoria o el compromiso de los participantes sea menor al esperado.',
    planDeAccion:
      'Diversificar canales de difusión; encuesta de expectativas al inicio; seguimiento personalizado de inasistencia.',
  },
  {
    nombre: 'Contingencia climática o logística',
    descripcion:
      'Eventos climáticos o problemas de transporte que obliguen a suspender o reprogramar actividades presenciales.',
    planDeAccion:
      'Definir fechas alternativas por actividad; protocolo de comunicación rápida; opción de sesiones híbridas cuando aplique.',
  },
  {
    nombre: 'Rotación del equipo clave',
    descripcion:
      'Posible salida de coordinadores o encargados que requieran traspaso de conocimiento y reemplazo a tiempo.',
    planDeAccion:
      'Documentar procesos y contactos; designar suplentes por rol; reunión de traspaso con mínimo 2 semanas de anticipación.',
  },
];

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function main() {
  console.log(
    '🌱 Seed oportunidades y amenazas: 2 oportunidades y 2 amenazas por proyecto...\n'
  );

  const proyectos = await prisma.proyecto.findMany({
    orderBy: { createdAt: 'asc' },
  });

  if (proyectos.length === 0) {
    console.log('⚠️ No hay proyectos en la base de datos.');
    return;
  }

  for (const proyecto of proyectos) {
    await prisma.oportunidadAmenaza.deleteMany({
      where: { proyectoId: proyecto.id },
    });

    const dosOportunidades = pick(OPORTUNIDADES, 2);
    const dosAmenazas = pick(AMENAZAS, 2);

    for (const o of dosOportunidades) {
      await prisma.oportunidadAmenaza.create({
        data: {
          proyectoId: proyecto.id,
          tipo: 'Oportunidad',
          nombre: o.nombre,
          descripcion: o.descripcion,
          planDeAccion: o.planDeAccion,
        },
      });
    }
    for (const a of dosAmenazas) {
      await prisma.oportunidadAmenaza.create({
        data: {
          proyectoId: proyecto.id,
          tipo: 'Amenaza',
          nombre: a.nombre,
          descripcion: a.descripcion,
          planDeAccion: a.planDeAccion,
        },
      });
    }

    console.log(
      `  ✓ ${proyecto.proyecto.substring(0, 50)}... → 2 oportunidades, 2 amenazas`
    );
  }

  console.log('\n✅ Seed oportunidades y amenazas finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
