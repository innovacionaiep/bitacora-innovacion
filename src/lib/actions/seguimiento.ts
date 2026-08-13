'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import {
  userHasPermission,
  userCanOnProject,
} from '@/lib/permissions/check';
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
 * Crear compromiso asociado a una reunión (coordinador o admin)
 */
export async function addCompromiso(
  proyectoId: string,
  descripcion: string,
  opts: {
    reunionId: string;
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

    if (!opts.reunionId?.trim()) {
      return {
        success: false,
        error: 'El compromiso debe estar asociado a una reunión',
        data: null,
      };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeCrear = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId,
      key: 'compromisos.create_edit',
    });
    if (!puedeCrear) {
      return {
        success: false,
        error: 'No tienes permiso para agregar compromisos en este proyecto',
        data: null,
      };
    }

    const reunion = await prisma.reunionSeguimiento.findFirst({
      where: { id: opts.reunionId, proyectoId },
      select: { id: true },
    });
    if (!reunion) {
      return {
        success: false,
        error: 'Reunión no encontrada en este proyecto',
        data: null,
      };
    }

    const compromiso = await prisma.compromisoProyecto.create({
      data: {
        proyectoId,
        reunionId: opts.reunionId,
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
      elementoEspecifico: '',
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
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeEditar = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId: compromiso.proyectoId,
      key: 'compromisos.create_edit',
    });
    if (!puedeEditar) {
      return {
        success: false,
        error: 'No tienes permiso para editar el compromiso en este proyecto',
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
      cambioGenerado: '',
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
 * Eliminar un compromiso (coordinador o admin con compromisos.create_edit).
 */
export async function deleteCompromiso(compromisoId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const compromiso = await prisma.compromisoProyecto.findUnique({
      where: { id: compromisoId },
      select: {
        id: true,
        proyectoId: true,
        titulo: true,
        descripcion: true,
      },
    });

    if (!compromiso) {
      return { success: false, error: 'Compromiso no encontrado', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeEliminar = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId: compromiso.proyectoId,
      key: 'compromisos.create_edit',
    });
    if (!puedeEliminar) {
      return {
        success: false,
        error: 'No tienes permiso para eliminar compromisos en este proyecto',
        data: null,
      };
    }

    await prisma.compromisoProyecto.delete({
      where: { id: compromisoId },
    });

    await createHistorialEntry({
      proyectoId: compromiso.proyectoId,
      accion: 'Eliminar',
      tabProyecto: 'Seguimiento',
      elementoEspecifico:
        (compromiso.titulo ?? compromiso.descripcion)?.substring(0, 80) ??
        'Compromiso',
      cambioGenerado: '',
    });

    revalidatePath('/proyectos');
    revalidatePath('/inicio');
    return { success: true, data: { id: compromisoId } };
  } catch (error) {
    console.error('Error al eliminar compromiso:', error);
    return {
      success: false,
      error: 'Error al eliminar compromiso',
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
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeMarcarRealizado = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId: compromiso.proyectoId,
      key: 'compromisos.mark_done',
    });
    if (!puedeMarcarRealizado) {
      return {
        success: false,
        error: 'No tienes permiso para marcar "Realizado (Encargado)"',
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
      cambioGenerado: compromiso.completado ? 'Marcado como pendiente' : '',
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

    const availableRoles = user.availableRoles ?? [];
    const canViewAll = await userHasPermission(
      availableRoles,
      'projects.view_all'
    );
    if (!canViewAll) {
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
 * Obtener reuniones de seguimiento de un proyecto (con compromisos).
 */
export async function getReunionesProyecto(proyectoId: string) {
  try {
    const reuniones = await prisma.reunionSeguimiento.findMany({
      where: { proyectoId },
      include: {
        compromisos: {
          orderBy: [{ completado: 'asc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: { numero: 'asc' },
    });

    return { success: true, data: reuniones };
  } catch (error) {
    console.error('Error al obtener reuniones:', error);
    return {
      success: false,
      error: 'Error al obtener reuniones',
      data: [],
    };
  }
}

/**
 * Crear reunión de seguimiento (coordinador o admin).
 * Obligatorios: número y fecha. Resumen opcional.
 */
export async function addReunion(
  proyectoId: string,
  data: { fecha: Date; resumen?: string; numero?: number }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    if (!data.fecha || Number.isNaN(data.fecha.getTime())) {
      return {
        success: false,
        error: 'La fecha de la reunión es obligatoria',
        data: null,
      };
    }

    const resumen = data.resumen?.trim() ?? '';

    const userEmail = (user as { email?: string | null }).email ?? null;
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeCrear = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId,
      key: 'compromisos.create_edit',
    });
    if (!puedeCrear) {
      return {
        success: false,
        error: 'No tienes permiso para agregar reuniones en este proyecto',
        data: null,
      };
    }

    let numero: number;
    if (data.numero !== undefined) {
      if (!Number.isInteger(data.numero) || data.numero < 1) {
        return {
          success: false,
          error: 'El número de reunión debe ser un entero mayor a 0',
          data: null,
        };
      }
      const existing = await prisma.reunionSeguimiento.findFirst({
        where: { proyectoId, numero: data.numero },
        select: { id: true },
      });
      if (existing) {
        return {
          success: false,
          error: `Ya existe una reunión N° ${data.numero} en este proyecto`,
          data: null,
        };
      }
      numero = data.numero;
    } else {
      const agg = await prisma.reunionSeguimiento.aggregate({
        where: { proyectoId },
        _max: { numero: true },
      });
      numero = (agg._max.numero ?? 0) + 1;
    }

    const reunion = await prisma.reunionSeguimiento.create({
      data: {
        proyectoId,
        numero,
        fecha: data.fecha,
        resumen,
      },
      include: {
        compromisos: true,
      },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Agregar reunión',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Reunión N° ${numero}`,
      cambioGenerado: resumen ? resumen.substring(0, 200) : '',
    });

    revalidatePath('/proyectos');
    return { success: true, data: reunion };
  } catch (error) {
    console.error('Error al agregar reunión:', error);
    return { success: false, error: 'Error al agregar reunión', data: null };
  }
}

/**
 * Actualizar número, fecha y/o resumen de una reunión (coordinador o admin).
 * Resumen puede quedar vacío.
 */
export async function updateReunion(
  reunionId: string,
  data: { fecha?: Date; resumen?: string; numero?: number }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { id: true, proyectoId: true, numero: true },
    });
    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const availableRoles =
      (user as { availableRoles?: string[] }).availableRoles ?? [];
    const puedeEditar = await userCanOnProject({
      availableRoles,
      email: userEmail,
      userId: user.id,
      proyectoId: reunion.proyectoId,
      key: 'compromisos.create_edit',
    });
    if (!puedeEditar) {
      return {
        success: false,
        error: 'No tienes permiso para editar reuniones en este proyecto',
        data: null,
      };
    }

    if (data.fecha !== undefined && Number.isNaN(data.fecha.getTime())) {
      return {
        success: false,
        error: 'La fecha de la reunión no es válida',
        data: null,
      };
    }

    if (data.numero !== undefined) {
      if (!Number.isInteger(data.numero) || data.numero < 1) {
        return {
          success: false,
          error: 'El número de reunión debe ser un entero mayor a 0',
          data: null,
        };
      }
      if (data.numero !== reunion.numero) {
        const existing = await prisma.reunionSeguimiento.findFirst({
          where: {
            proyectoId: reunion.proyectoId,
            numero: data.numero,
            NOT: { id: reunionId },
          },
          select: { id: true },
        });
        if (existing) {
          return {
            success: false,
            error: `Ya existe una reunión N° ${data.numero} en este proyecto`,
            data: null,
          };
        }
      }
    }

    const updated = await prisma.reunionSeguimiento.update({
      where: { id: reunionId },
      data: {
        ...(data.fecha !== undefined && { fecha: data.fecha }),
        ...(data.resumen !== undefined && { resumen: data.resumen.trim() }),
        ...(data.numero !== undefined && { numero: data.numero }),
      },
      include: {
        compromisos: {
          orderBy: [{ completado: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Reunión N° ${updated.numero}`,
      cambioGenerado:
        data.resumen !== undefined && data.resumen.trim()
          ? data.resumen.trim()
          : data.fecha !== undefined
            ? data.fecha.toLocaleDateString('es-CL')
            : '',
    });

    revalidatePath('/proyectos');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al actualizar reunión:', error);
    return {
      success: false,
      error: 'Error al actualizar reunión',
      data: null,
    };
  }
}

/**
 * Obtener compromisos pendientes de los proyectos donde el usuario participa (portal Inicio).
 */
export async function getCompromisosPendientesParaUsuario(
  _activeRole?: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const participaciones = await prisma.proyectoParticipante.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email
            ? [
                {
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

