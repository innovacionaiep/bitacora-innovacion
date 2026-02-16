'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';

/**
 * Obtener los roles para los que el usuario tiene al menos un proyecto (roles con proyectos vigentes).
 * Usado en el menú de la cabecera del portal de Inicio.
 */
export async function getRolesConProyectosVigentes() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const participaciones = await prisma.proyectoParticipante.findMany({
      where: { userId: user.id },
      select: { rol: true },
      distinct: ['rol'],
    });

    const roles = participaciones.map((p) => p.rol).filter(Boolean);
    return { success: true, data: roles };
  } catch (error) {
    console.error('Error al obtener roles con proyectos vigentes:', error);
    return {
      success: false,
      error: 'Error al obtener roles',
      data: [],
    };
  }
}

/**
 * Obtener proyectoIds donde el usuario participa con el rol activo.
 * Función interna para reutilizar en otras actions del portal.
 */
async function getProyectoIdsPorRol(userId: string, activeRole: string | null) {
  if (!activeRole) return [];
  const list = await prisma.proyectoParticipante.findMany({
    where: { userId, rol: activeRole },
    select: { proyectoId: true },
  });
  return list.map((p) => p.proyectoId);
}

/**
 * Proyectos donde el usuario participa con el rol activo (id, nombre, avanceGantt, rol).
 */
export async function getProyectosDelUsuarioConRol(activeRole: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    if (!activeRole) {
      return { success: true, data: [] };
    }

    const participaciones = await prisma.proyectoParticipante.findMany({
      where: { userId: user.id, rol: activeRole },
      include: {
        proyecto: {
          select: {
            id: true,
            proyecto: true,
            fondo: true,
            avanceGantt: true,
            presupuestoUsado: true,
            presupuestoTotal: true,
            indicadores: { select: { porcentajeAvance: true } },
          },
        },
      },
    });

    const data = participaciones
      .filter((p) => p.proyecto)
      .map((p) => {
        const proy = p.proyecto!;
        const indicadores = proy.indicadores ?? [];
        const avanceIndicadores =
          indicadores.length > 0
            ? Math.round(
                (indicadores.reduce((s, i) => s + i.porcentajeAvance, 0) /
                  indicadores.length) *
                  100
              ) / 100
            : 0;
        const avancePresupuesto =
          proy.presupuestoTotal > 0
            ? Math.round(
                (proy.presupuestoUsado / proy.presupuestoTotal) * 100
              )
            : 0;
        return {
          id: proy.id,
          proyecto: proy.proyecto,
          fondo: proy.fondo,
          avanceGantt: proy.avanceGantt,
          avanceIndicadores,
          avancePresupuesto,
          rol: p.rol,
        };
      });

    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener proyectos del usuario por rol:', error);
    return {
      success: false,
      error: 'Error al obtener proyectos',
      data: [],
    };
  }
}

export interface AlertasPortal {
  coordinador?: {
    actividadesPorValidar: Array<{ id: string; name: string; proyectoId: string; proyectoNombre: string }>;
    indicadoresPorValidar: Array<{ id: string; nombre: string; proyectoId: string; proyectoNombre: string }>;
  };
  encargado?: {
    actividadesPorEvidenciar: Array<{ id: string; name: string; proyectoId: string; proyectoNombre: string }>;
    indicadoresPorEvidenciar: Array<{ id: string; nombre: string; proyectoId: string; proyectoNombre: string }>;
  };
}

/**
 * Alertas del portal según rol activo: Coordinador → por validar; Encargado → por evidenciar.
 * Solo proyectos donde el usuario tiene ese rol.
 */
export async function getAlertasPortalUsuario(activeRole: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const proyectoIds = await getProyectoIdsPorRol(user.id, activeRole);
    if (proyectoIds.length === 0) {
      return {
        success: true,
        data: { coordinador: undefined, encargado: undefined },
      };
    }

    const result: AlertasPortal = {};

    if (activeRole === 'Coordinador') {
      const [actividades, indicadores] = await Promise.all([
        prisma.activity.findMany({
          where: {
            projectId: { in: proyectoIds },
            validadoPorCoordinador: false,
          },
          select: {
            id: true,
            name: true,
            projectId: true,
            project: { select: { proyecto: true } },
          },
        }),
        prisma.indicador.findMany({
          where: {
            proyectoId: { in: proyectoIds },
            validadoPorCoordinador: false,
          },
          select: {
            id: true,
            nombre: true,
            proyectoId: true,
            proyecto: { select: { proyecto: true } },
          },
        }),
      ]);

      result.coordinador = {
        actividadesPorValidar: actividades.map((a) => ({
          id: a.id,
          name: a.name,
          proyectoId: a.projectId,
          proyectoNombre: a.project?.proyecto ?? '',
        })),
        indicadoresPorValidar: indicadores.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          proyectoId: i.proyectoId,
          proyectoNombre: i.proyecto?.proyecto ?? '',
        })),
      };
    }

    if (activeRole === 'Encargado') {
      const [actividades, indicadores] = await Promise.all([
        prisma.activity.findMany({
          where: {
            projectId: { in: proyectoIds },
            evidencias: { none: {} },
          },
          select: {
            id: true,
            name: true,
            projectId: true,
            project: { select: { proyecto: true } },
          },
        }),
        prisma.indicador.findMany({
          where: {
            proyectoId: { in: proyectoIds },
            evidencias: { none: {} },
          },
          select: {
            id: true,
            nombre: true,
            proyectoId: true,
            proyecto: { select: { proyecto: true } },
          },
        }),
      ]);

      result.encargado = {
        actividadesPorEvidenciar: actividades.map((a) => ({
          id: a.id,
          name: a.name,
          proyectoId: a.projectId,
          proyectoNombre: a.project?.proyecto ?? '',
        })),
        indicadoresPorEvidenciar: indicadores.map((i) => ({
          id: i.id,
          nombre: i.nombre,
          proyectoId: i.proyectoId,
          proyectoNombre: i.proyecto?.proyecto ?? '',
        })),
      };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error al obtener alertas del portal:', error);
    return {
      success: false,
      error: 'Error al obtener alertas',
      data: null,
    };
  }
}
