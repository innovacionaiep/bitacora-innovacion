'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';
import { toggleTaskCompletion } from './gantt';
import { updateIndicadorResultado } from './indicadores';

function parseValue(value: string | null | undefined): number {
  if (!value || value === '') return 0;
  const cleaned = value.toString().replace(/%/g, '').replace(/,/g, '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Obtener el rol del usuario en un proyecto (ProyectoParticipante).
 * Busca por userId; si no hay coincidencia y se pasa userEmail, busca por email (alineado con la lógica del cliente).
 * Si el usuario tiene varios roles, devuelve 'Coordinador' si tiene ese rol (para permisos de validación).
 */
export async function getRolUsuarioEnProyecto(
  userId: string,
  proyectoId: string,
  userEmail?: string | null
): Promise<string | null> {
  const byUserId = await prisma.proyectoParticipante.findMany({
    where: { proyectoId, userId },
    select: { rol: true },
  });
  const hasCoord = byUserId.some(
    (x) => x.rol?.trim().toLowerCase() === 'coordinador'
  );
  if (hasCoord) return 'Coordinador';
  if (byUserId.length > 0) return byUserId[0].rol ?? null;
  if (!userEmail?.trim()) return null;
  const normalized = userEmail.trim().toLowerCase();
  const byEmail = await prisma.proyectoParticipante.findMany({
    where: { proyectoId, email: { not: null } },
    select: { rol: true, email: true },
  });
  const matches = byEmail.filter(
    (x) => x.email?.trim().toLowerCase() === normalized
  );
  const hasCoordByEmail = matches.some(
    (x) => x.rol?.trim().toLowerCase() === 'coordinador'
  );
  if (hasCoordByEmail) return 'Coordinador';
  return matches[0]?.rol ?? null;
}

/**
 * Crear compromiso (nivel proyecto; coordinador o admin)
 */
export async function addCompromiso(
  proyectoId: string,
  descripcion: string,
  opts?: {
    titulo?: string | null;
    fechaLimite?: Date;
    asignadoA?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const rol = await getRolUsuarioEnProyecto(user.id, proyectoId, userEmail);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeCrear = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeCrear) {
      return {
        success: false,
        error: 'Solo el coordinador o un admin pueden agregar compromisos',
        data: null,
      };
    }

    const compromiso = await prisma.compromisoProyecto.create({
      data: {
        proyectoId,
        titulo: opts?.titulo?.trim() || null,
        descripcion,
        fechaLimite: opts?.fechaLimite ?? null,
        asignadoA: opts?.asignadoA ?? null,
      },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Agregar compromiso',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: descripcion.substring(0, 80),
      cambioGenerado: descripcion,
    });

    revalidatePath('/proyectos');
    return { success: true, data: compromiso };
  } catch (error) {
    console.error('Error al agregar compromiso:', error);
    return { success: false, error: 'Error al agregar compromiso', data: null };
  }
}

/**
 * Actualizar título, descripción y/o fecha límite de un compromiso (solo coordinador o admin)
 */
export async function updateCompromiso(
  compromisoId: string,
  data: {
    titulo?: string | null;
    descripcion?: string;
    fechaLimite?: Date | null;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const compromiso = await prisma.compromisoProyecto.findUnique({
      where: { id: compromisoId },
      select: { proyectoId: true, titulo: true, descripcion: true },
    });

    if (!compromiso) {
      return { success: false, error: 'Compromiso no encontrado', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const rol = await getRolUsuarioEnProyecto(user.id, compromiso.proyectoId, userEmail);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeEditar = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeEditar) {
      return {
        success: false,
        error: 'Solo el coordinador o un admin pueden editar el compromiso',
        data: null,
      };
    }

    const updated = await prisma.compromisoProyecto.update({
      where: { id: compromisoId },
      data: {
        ...(data.titulo !== undefined && {
          titulo: data.titulo?.trim() || null,
        }),
        ...(data.descripcion !== undefined && {
          descripcion: data.descripcion,
        }),
        ...(data.fechaLimite !== undefined && {
          fechaLimite: data.fechaLimite,
        }),
      },
    });

    await createHistorialEntry({
      proyectoId: compromiso.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Seguimiento',
      elementoEspecifico:
        (
          data.titulo ??
          data.descripcion ??
          compromiso.titulo ??
          compromiso.descripcion
        )
          ?.toString()
          .substring(0, 80) ?? '',
      cambioGenerado: 'Compromiso actualizado',
    });

    revalidatePath('/proyectos');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al actualizar compromiso:', error);
    return {
      success: false,
      error: 'Error al actualizar compromiso',
      data: null,
    };
  }
}

/**
 * Marcar o desmarcar compromiso como completado (solo encargado o admin)
 */
export async function toggleCompromiso(compromisoId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const compromiso = await prisma.compromisoProyecto.findUnique({
      where: { id: compromisoId },
      select: { proyectoId: true, completado: true, descripcion: true },
    });

    if (!compromiso) {
      return { success: false, error: 'Compromiso no encontrado', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const rol = await getRolUsuarioEnProyecto(user.id, compromiso.proyectoId, userEmail);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeMarcarRealizado = rol === 'Encargado' || activeRole === 'Admin';
    if (!puedeMarcarRealizado) {
      return {
        success: false,
        error: 'Solo el encargado o un admin pueden marcar "Realizado (Encargado)"',
        data: null,
      };
    }

    const updated = await prisma.compromisoProyecto.update({
      where: { id: compromisoId },
      data: { completado: !compromiso.completado },
    });

    await createHistorialEntry({
      proyectoId: compromiso.proyectoId,
      accion: compromiso.completado ? 'Actualizar' : 'Marcar realizada',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: compromiso.descripcion.substring(0, 80),
      cambioGenerado: compromiso.completado
        ? 'Compromiso marcado como pendiente'
        : 'Compromiso completado',
    });

    revalidatePath('/proyectos');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al actualizar compromiso:', error);
    return {
      success: false,
      error: 'Error al actualizar compromiso',
      data: null,
    };
  }
}

/**
 * Marcar o desmarcar validación del coordinador en un compromiso
 */
export async function toggleValidacionCompromiso(compromisoId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const compromiso = await prisma.compromisoProyecto.findUnique({
      where: { id: compromisoId },
      select: {
        proyectoId: true,
        validadoPorCoordinador: true,
        descripcion: true,
      },
    });

    if (!compromiso) {
      return { success: false, error: 'Compromiso no encontrado', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const rol = await getRolUsuarioEnProyecto(user.id, compromiso.proyectoId, userEmail);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeValidar = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeValidar) {
      return {
        success: false,
        error: 'Solo el coordinador o un admin pueden validar compromisos',
        data: null,
      };
    }

    const updated = await prisma.compromisoProyecto.update({
      where: { id: compromisoId },
      data: { validadoPorCoordinador: !compromiso.validadoPorCoordinador },
    });

    await createHistorialEntry({
      proyectoId: compromiso.proyectoId,
      accion: compromiso.validadoPorCoordinador
        ? 'Quitar validación'
        : 'Validar compromiso',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: compromiso.descripcion.substring(0, 80),
      cambioGenerado: compromiso.validadoPorCoordinador
        ? 'Validación quitada'
        : 'Compromiso validado por coordinador',
    });

    revalidatePath('/proyectos');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al validar compromiso:', error);
    return {
      success: false,
      error: 'Error al validar compromiso',
      data: null,
    };
  }
}

/**
 * Obtener proyectos donde el usuario es coordinador
 */
export async function getProyectosComoCoordinador() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const participantes = await prisma.proyectoParticipante.findMany({
      where: {
        userId: user.id,
        rol: 'Coordinador',
      },
      include: {
        proyecto: {
          select: { id: true, proyecto: true, sede: true },
        },
      },
    });

    const proyectos = participantes.map((p) => p.proyecto).filter(Boolean);
    return { success: true, data: proyectos };
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return {
      success: false,
      error: 'Error al obtener proyectos',
      data: [],
    };
  }
}

/**
 * Obtener todos los proyectos para la página de seguimiento.
 * Solo Admin y Coordinador pueden acceder - ven todos los proyectos.
 */
export async function getProyectosParaSeguimiento() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const activeRole = user.activeRole ?? null;
    if (activeRole !== 'Admin' && activeRole !== 'Coordinador') {
      return { success: false, error: 'Acceso denegado', data: [] };
    }

    const proyectos = await prisma.proyecto.findMany({
      select: { id: true, proyecto: true, sede: true },
      orderBy: { proyecto: 'asc' },
    });

    return { success: true, data: proyectos };
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    return {
      success: false,
      error: 'Error al obtener proyectos',
      data: [],
    };
  }
}

/**
 * Obtener compromisos pendientes de un proyecto (completado = false)
 */
export async function getCompromisosPendientesProyecto(proyectoId: string) {
  try {
    const compromisos = await prisma.compromisoProyecto.findMany({
      where: {
        proyectoId,
        completado: false,
      },
      orderBy: [{ fechaLimite: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, data: compromisos };
  } catch (error) {
    console.error('Error al obtener compromisos:', error);
    return {
      success: false,
      error: 'Error al obtener compromisos',
      data: [],
    };
  }
}

/**
 * Obtener todos los compromisos de un proyecto (para el muro de post-its)
 */
export async function getCompromisosProyecto(proyectoId: string) {
  try {
    const compromisos = await prisma.compromisoProyecto.findMany({
      where: { proyectoId },
      orderBy: [{ fechaLimite: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, data: compromisos };
  } catch (error) {
    console.error('Error al obtener compromisos:', error);
    return {
      success: false,
      error: 'Error al obtener compromisos',
      data: [],
    };
  }
}

/**
 * Obtener compromisos pendientes de los proyectos donde el usuario participa con el rol activo (portal Inicio).
 */
export async function getCompromisosPendientesParaUsuario(activeRole: string | null) {
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

    const compromisos = await prisma.compromisoProyecto.findMany({
      where: {
        proyectoId: { in: proyectoIds },
        completado: false,
      },
      include: {
        proyecto: {
          select: { id: true, proyecto: true },
        },
      },
      orderBy: [{ fechaLimite: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, data: compromisos };
  } catch (error) {
    console.error('Error al obtener compromisos para usuario:', error);
    return {
      success: false,
      error: 'Error al obtener compromisos',
      data: [],
    };
  }
}

