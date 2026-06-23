'use server';

import type { Prisma } from '@prisma/client';
import { parse } from 'date-fns';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';

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
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Obtener historial de un proyecto con filtros opcionales
 * @param limit - Límite de resultados (ej. 10 para resumen). Sin límite si no se pasa.
 */
export async function getHistorialProyecto(
  proyectoId: string,
  filtros?: HistorialFiltros,
  limit?: number
) {
  try {
    const where: Prisma.HistorialProyectoWhereInput = {
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

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      const parseDateStr = (str: string): Date => {
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return new Date(str + 'T00:00:00');
          }
          const sep = str.includes('/') ? '/' : '-';
          const fmt = sep === '/' ? 'dd/MM/yyyy' : 'dd-MM-yyyy';
          return parse(str, fmt, new Date());
        } catch {
          return new Date(str);
        }
      };
      const fechaFilter: { gte?: Date; lte?: Date } = {};
      if (filtros.fechaDesde) {
        const fechaDesde = parseDateStr(filtros.fechaDesde);
        fechaDesde.setHours(0, 0, 0, 0);
        fechaFilter.gte = fechaDesde;
      }
      if (filtros.fechaHasta) {
        const fechaHasta = parseDateStr(filtros.fechaHasta);
        fechaHasta.setHours(23, 59, 59, 999);
        fechaFilter.lte = fechaHasta;
      }
      where.fecha = fechaFilter;
    }

    const historial = await prisma.historialProyecto.findMany({
      where,
      take: limit ?? 50,
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

    // Obtener rango de fechas real de los logs del proyecto
    const dateRange = await prisma.historialProyecto.aggregate({
      where: { proyectoId },
      _min: { fecha: true },
      _max: { fecha: true },
    });

    return {
      success: true,
      data: {
        personas: personas.map((p) => p.user).filter(Boolean),
        acciones: acciones.map((a) => a.accion),
        tabs: tabs.map((t) => t.tabProyecto),
        fechaMin: dateRange._min.fecha ?? undefined,
        fechaMax: dateRange._max.fecha ?? undefined,
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
        fechaMin: undefined,
        fechaMax: undefined,
      },
    };
  }
}

/**
 * Obtener últimas entradas de historial de los proyectos donde el usuario participa con el rol activo (portal Inicio).
 */
export async function getHistorialRecienteParaUsuario(
  activeRole: string | null,
  limit = 10
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }
    if (!activeRole) {
      return { success: true, data: [] };
    }

    const participaciones = await prisma.proyectoParticipante.findMany({
      where: {
        rol: activeRole,
        OR: [
          { userId: user.id },
          ...(user.email
            ? [
                {
                  userId: null,
                  email: { equals: user.email, mode: 'insensitive' as const },
                },
              ]
            : []),
        ],
      },
      select: { proyectoId: true },
    });
    const proyectoIds = participaciones.map((p) => p.proyectoId);
    if (proyectoIds.length === 0) {
      return { success: true, data: [] };
    }

    const historial = await prisma.historialProyecto.findMany({
      where: { proyectoId: { in: proyectoIds } },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        proyecto: {
          select: { id: true, proyecto: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      success: true,
      data: historial,
    };
  } catch (error) {
    console.error('Error al obtener historial reciente para usuario:', error);
    return {
      success: false,
      error: 'Error al obtener historial',
      data: [],
    };
  }
}
