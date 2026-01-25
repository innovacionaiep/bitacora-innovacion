'use server';

import { prisma } from '@/lib/prisma';

/**
 * Crear o actualizar un snapshot mensual para un proyecto
 */
export async function createOrUpdateSnapshot(
  proyectoId: string,
  mes: number,
  anio: number,
  avanceGantt: number,
  objetivos: number
) {
  try {
    const snapshot = await prisma.snapshotMensualProyecto.upsert({
      where: {
        proyectoId_mes_anio: {
          proyectoId,
          mes,
          anio,
        },
      },
      update: {
        avanceGantt,
        objetivos,
      },
      create: {
        proyectoId,
        mes,
        anio,
        avanceGantt,
        objetivos,
      },
    });

    return {
      success: true,
      data: snapshot,
    };
  } catch (error) {
    console.error('Error al crear/actualizar snapshot:', error);
    return {
      success: false,
      error: 'Error al crear/actualizar snapshot mensual',
    };
  }
}

/**
 * Obtener el snapshot del mes anterior para un proyecto
 * Usado para calcular la variación mensual
 */
export async function getSnapshotMesAnterior(proyectoId: string) {
  try {
    const ahora = new Date();
    let mesAnterior = ahora.getMonth(); // getMonth() devuelve 0-11, así que el mes actual - 1
    let anioMesAnterior = ahora.getFullYear();

    // Si estamos en enero, el mes anterior es diciembre del año pasado
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioMesAnterior = anioMesAnterior - 1;
    }

    const snapshot = await prisma.snapshotMensualProyecto.findUnique({
      where: {
        proyectoId_mes_anio: {
          proyectoId,
          mes: mesAnterior,
          anio: anioMesAnterior,
        },
      },
    });

    return {
      success: true,
      data: snapshot,
      mesAnterior,
      anioMesAnterior,
    };
  } catch (error) {
    console.error('Error al obtener snapshot del mes anterior:', error);
    return {
      success: false,
      error: 'Error al obtener snapshot del mes anterior',
      data: null,
    };
  }
}


/**
 * Crear snapshots de fin de mes para todos los proyectos
 * Esta función se puede ejecutar manualmente o mediante un cron job
 */
export async function createSnapshotsFinDeMes() {
  try {
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1; // 1-12
    const anioActual = ahora.getFullYear();

    // Obtener todos los proyectos con sus valores actuales
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        avanceGantt: true,
        objetivos: true,
      },
    });

    const resultados = await Promise.all(
      proyectos.map(async (proyecto) => {
        return await createOrUpdateSnapshot(
          proyecto.id,
          mesActual,
          anioActual,
          proyecto.avanceGantt,
          proyecto.objetivos
        );
      })
    );

    const exitosos = resultados.filter((r) => r.success).length;
    const fallidos = resultados.filter((r) => !r.success).length;

    return {
      success: true,
      message: `Snapshots creados: ${exitosos} exitosos, ${fallidos} fallidos`,
      total: proyectos.length,
      exitosos,
      fallidos,
    };
  } catch (error) {
    console.error('Error al crear snapshots de fin de mes:', error);
    return {
      success: false,
      error: 'Error al crear snapshots de fin de mes',
    };
  }
}

/**
 * Obtener todos los snapshots de un proyecto (para histórico)
 */
export async function getSnapshotsProyecto(proyectoId: string) {
  try {
    const snapshots = await prisma.snapshotMensualProyecto.findMany({
      where: { proyectoId },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });

    return {
      success: true,
      data: snapshots,
    };
  } catch (error) {
    console.error('Error al obtener snapshots del proyecto:', error);
    return {
      success: false,
      error: 'Error al obtener snapshots',
      data: [],
    };
  }
}
