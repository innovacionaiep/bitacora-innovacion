'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';

export interface HistorialEntryData {
  proyectoId: string;
  accion: string;
  tabProyecto: string;
  elementoEspecifico: string;
  cambioGenerado: string;
}

/**
 * Crear una nueva entrada en el historial
 */
export async function createHistorialEntry(data: HistorialEntryData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    const historialEntry = await prisma.historialProyecto.create({
      data: {
        proyectoId: data.proyectoId,
        userId: user.id,
        accion: data.accion,
        tabProyecto: data.tabProyecto,
        elementoEspecifico: data.elementoEspecifico,
        cambioGenerado: data.cambioGenerado,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/proyectos');
    return {
      success: true,
      data: historialEntry,
    };
  } catch (error) {
    console.error('Error al crear entrada de historial:', error);
    return {
      success: false,
      error: 'Error al crear entrada de historial',
    };
  }
}

export interface HistorialFiltros {
  personaId?: string;
  accion?: string;
  tabProyecto?: string;
}

/**
 * Obtener historial de un proyecto con filtros opcionales
 */
export async function getHistorialProyecto(
  proyectoId: string,
  filtros?: HistorialFiltros
) {
  try {
    const where: any = {
      proyectoId,
    };

    if (filtros?.personaId) {
      where.userId = filtros.personaId;
    }

    if (filtros?.accion) {
      where.accion = filtros.accion;
    }

    if (filtros?.tabProyecto) {
      where.tabProyecto = filtros.tabProyecto;
    }

    const historial = await prisma.historialProyecto.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    return {
      success: true,
      data: historial,
    };
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return {
      success: false,
      error: 'Error al obtener historial',
      data: [],
    };
  }
}

/**
 * Obtener opciones para los filtros
 */
export async function getHistorialFiltros(proyectoId: string) {
  try {
    // Obtener todas las personas que han realizado acciones
    const personas = await prisma.historialProyecto.findMany({
      where: { proyectoId },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      distinct: ['userId'],
    });

    // Obtener todas las acciones únicas
    const acciones = await prisma.historialProyecto.findMany({
      where: { proyectoId },
      select: {
        accion: true,
      },
      distinct: ['accion'],
    });

    // Obtener todos los tabs únicos
    const tabs = await prisma.historialProyecto.findMany({
      where: { proyectoId },
      select: {
        tabProyecto: true,
      },
      distinct: ['tabProyecto'],
    });

    return {
      success: true,
      data: {
        personas: personas.map((p) => p.user).filter(Boolean),
        acciones: acciones.map((a) => a.accion),
        tabs: tabs.map((t) => t.tabProyecto),
      },
    };
  } catch (error) {
    console.error('Error al obtener filtros:', error);
    return {
      success: false,
      error: 'Error al obtener filtros',
      data: {
        personas: [],
        acciones: [],
        tabs: [],
      },
    };
  }
}
