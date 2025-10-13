'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Proyecto } from '@prisma/client';

export type ProyectoData = Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Obtener todos los proyectos
 */
export async function getProyectos() {
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { success: true, data: proyectos };
  } catch (error) {
    console.error('Error getting proyectos:', error);
    return { success: false, error: 'Error al obtener proyectos' };
  }
}

/**
 * Obtener un proyecto por ID
 */
export async function getProyecto(id: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        activities: {
          include: {
            tasks: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error getting proyecto:', error);
    return { success: false, error: 'Error al obtener proyecto' };
  }
}

/**
 * Crear un nuevo proyecto
 */
export async function createProyecto(data: ProyectoData) {
  try {
    const proyecto = await prisma.proyecto.create({
      data: {
        proyecto: data.proyecto,
        fondo: data.fondo,
        sede: data.sede,
        escuela: data.escuela,
        avanceGantt: data.avanceGantt || 0,
        objetivos: data.objetivos || 0,
        presupuestoUsado: data.presupuestoUsado || 0,
        presupuestoTotal: data.presupuestoTotal,
        reunionesHechas: data.reunionesHechas || 0,
        reunionesTotales: data.reunionesTotales || 0,
        participantes: data.participantes,
      },
    });

    revalidatePath('/proyectos');
    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error creating proyecto:', error);
    return { success: false, error: 'Error al crear proyecto' };
  }
}

/**
 * Actualizar un proyecto
 */
export async function updateProyecto(
  id: string,
  data: Partial<ProyectoData>
) {
  try {
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
        ...(data.fondo !== undefined && { fondo: data.fondo }),
        ...(data.sede !== undefined && { sede: data.sede }),
        ...(data.escuela !== undefined && { escuela: data.escuela }),
        ...(data.avanceGantt !== undefined && { avanceGantt: data.avanceGantt }),
        ...(data.objetivos !== undefined && { objetivos: data.objetivos }),
        ...(data.presupuestoUsado !== undefined && {
          presupuestoUsado: data.presupuestoUsado,
        }),
        ...(data.presupuestoTotal !== undefined && {
          presupuestoTotal: data.presupuestoTotal,
        }),
        ...(data.reunionesHechas !== undefined && {
          reunionesHechas: data.reunionesHechas,
        }),
        ...(data.reunionesTotales !== undefined && {
          reunionesTotales: data.reunionesTotales,
        }),
        ...(data.participantes !== undefined && {
          participantes: data.participantes,
        }),
      },
    });

    revalidatePath('/proyectos');
    revalidatePath(`/gantt`);
    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error updating proyecto:', error);
    return { success: false, error: 'Error al actualizar proyecto' };
  }
}

/**
 * Eliminar un proyecto
 */
export async function deleteProyecto(id: string) {
  try {
    await prisma.proyecto.delete({
      where: { id },
    });

    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting proyecto:', error);
    return { success: false, error: 'Error al eliminar proyecto' };
  }
}

