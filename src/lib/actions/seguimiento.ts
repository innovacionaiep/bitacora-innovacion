'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';
import { toggleTaskCompletion } from './gantt';
import { updateIndicadorResultado } from './indicadores';

export interface ReunionSeguimientoData {
  proyectoId: string;
  fecha: Date;
  duracionMinutos?: number;
  resumen?: string;
  notas?: string;
}

export interface ReunionSeguimientoFiltros {
  fechaDesde?: Date;
  fechaHasta?: Date;
  coordinadorId?: string;
}

function parseValue(value: string | null | undefined): number {
  if (!value || value === '') return 0;
  const cleaned = value.toString().replace(/%/g, '').replace(/,/g, '.').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Obtener el rol del usuario en un proyecto (ProyectoParticipante)
 */
export async function getRolUsuarioEnProyecto(
  userId: string,
  proyectoId: string
): Promise<string | null> {
  const p = await prisma.proyectoParticipante.findFirst({
    where: { proyectoId, userId },
    select: { rol: true },
  });
  return p?.rol ?? null;
}

/**
 * Listar reuniones de un proyecto con filtros opcionales
 */
export async function getReunionesProyecto(
  proyectoId: string,
  filtros?: ReunionSeguimientoFiltros
) {
  try {
    const where: {
      proyectoId: string;
      fecha?: object;
      coordinadorId?: string;
    } = {
      proyectoId,
    };

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) {
        (where.fecha as Record<string, Date>).gte = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        (where.fecha as Record<string, Date>).lte = filtros.fechaHasta;
      }
    }

    if (filtros?.coordinadorId) {
      where.coordinadorId = filtros.coordinadorId;
    }

    const reuniones = await prisma.reunionSeguimiento.findMany({
      where,
      include: {
        coordinador: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            puntosTratados: true,
            tareasMarcadas: true,
            indicadoresActualizados: true,
            oportunidadesAmenazas: true,
            temasPresupuesto: true,
            compromisos: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
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
 * Obtener reunión completa por ID con todos sus datos relacionados
 */
export async function getReunionById(reunionId: string) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      include: {
        coordinador: {
          select: { id: true, name: true, email: true, image: true },
        },
        proyecto: {
          select: { id: true, proyecto: true },
        },
        puntosTratados: { orderBy: { orden: 'asc' } },
        tareasMarcadas: {
          include: {
            task: {
              include: {
                activity: { select: { name: true } },
              },
            },
          },
        },
        indicadoresActualizados: {
          include: {
            indicador: { select: { nombre: true } },
          },
        },
        oportunidadesAmenazas: true,
        temasPresupuesto: true,
        compromisos: {
          include: {
            proyecto: { select: { id: true, proyecto: true } },
          },
        },
      },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    return { success: true, data: reunion };
  } catch (error) {
    console.error('Error al obtener reunión:', error);
    return {
      success: false,
      error: 'Error al obtener reunión',
      data: null,
    };
  }
}

/**
 * Crear una nueva reunión de seguimiento
 */
export async function createReunion(data: ReunionSeguimientoData) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const reunion = await prisma.reunionSeguimiento.create({
      data: {
        proyectoId: data.proyectoId,
        coordinadorId: user.id,
        fecha: data.fecha,
        duracionMinutos: data.duracionMinutos ?? null,
        resumen: data.resumen ?? null,
        notas: data.notas ?? null,
      },
      include: {
        coordinador: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.proyecto.update({
      where: { id: data.proyectoId },
      data: { reunionesHechas: { increment: 1 } },
    });

    await createHistorialEntry({
      proyectoId: data.proyectoId,
      accion: 'Registrar reunión',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Reunión del ${data.fecha.toLocaleDateString('es-CL')}`,
      cambioGenerado: data.resumen || 'Nueva reunión de seguimiento',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: reunion };
  } catch (error) {
    console.error('Error al crear reunión:', error);
    return {
      success: false,
      error: 'Error al crear reunión',
      data: null,
    };
  }
}

/**
 * Actualizar una reunión
 */
export async function updateReunion(
  reunionId: string,
  data: Partial<Omit<ReunionSeguimientoData, 'proyectoId'>>
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const updated = await prisma.reunionSeguimiento.update({
      where: { id: reunionId },
      data: {
        ...(data.fecha !== undefined && { fecha: data.fecha }),
        ...(data.duracionMinutos !== undefined && {
          duracionMinutos: data.duracionMinutos,
        }),
        ...(data.resumen !== undefined && { resumen: data.resumen }),
        ...(data.notas !== undefined && { notas: data.notas }),
      },
      include: {
        coordinador: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Reunión del ${updated.fecha.toLocaleDateString('es-CL')}`,
      cambioGenerado: 'Reunión actualizada',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
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
 * Eliminar una reunión
 */
export async function deleteReunion(reunionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    await prisma.reunionSeguimiento.delete({
      where: { id: reunionId },
    });

    await prisma.proyecto.update({
      where: { id: reunion.proyectoId },
      data: { reunionesHechas: { decrement: 1 } },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: 'Reunión eliminada',
      cambioGenerado: 'Reunión de seguimiento eliminada',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar reunión:', error);
    return { success: false, error: 'Error al eliminar reunión' };
  }
}

/**
 * Iniciar reunión en vivo (estado en_curso, inicioEnVivoAt = now)
 */
export async function iniciarReunionEnVivo(reunionId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { id: true, proyectoId: true, estado: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    if (reunion.estado === 'en_curso') {
      return {
        success: false,
        error: 'La reunión ya está en curso',
        data: null,
      };
    }

    const updated = await prisma.reunionSeguimiento.update({
      where: { id: reunionId },
      data: {
        estado: 'en_curso',
        inicioEnVivoAt: new Date(),
      },
      include: {
        coordinador: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al iniciar reunión en vivo:', error);
    return {
      success: false,
      error: 'Error al iniciar reunión en vivo',
      data: null,
    };
  }
}

/**
 * Finalizar reunión en vivo (estado finalizada, guardar transcripción y duración)
 */
export async function finalizarReunionEnVivo(
  reunionId: string,
  opts?: { transcripcion?: string; duracionMinutos?: number }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { id: true, proyectoId: true, inicioEnVivoAt: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const duracionMinutos =
      opts?.duracionMinutos ??
      (reunion.inicioEnVivoAt
        ? Math.round((Date.now() - reunion.inicioEnVivoAt.getTime()) / 60_000)
        : undefined);

    const updated = await prisma.reunionSeguimiento.update({
      where: { id: reunionId },
      data: {
        estado: 'finalizada',
        ...(opts?.transcripcion !== undefined && {
          transcripcion: opts.transcripcion,
        }),
        ...(duracionMinutos !== undefined && {
          duracionMinutos,
        }),
      },
      include: {
        coordinador: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Finalizar reunión',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Reunión del ${updated.fecha.toLocaleDateString('es-CL')}`,
      cambioGenerado:
        duracionMinutos != null
          ? `Reunión finalizada (duración: ${duracionMinutos} min)`
          : 'Reunión finalizada',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al finalizar reunión en vivo:', error);
    return {
      success: false,
      error: 'Error al finalizar reunión en vivo',
      data: null,
    };
  }
}

/**
 * Agregar punto tratado a una reunión
 */
export async function addPuntoReunion(
  reunionId: string,
  titulo: string,
  descripcion?: string
) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true, puntosTratados: { select: { orden: true } } },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const maxOrden =
      reunion.puntosTratados.length > 0
        ? Math.max(...reunion.puntosTratados.map((p) => p.orden))
        : -1;

    const punto = await prisma.puntoReunion.create({
      data: {
        reunionId,
        titulo,
        descripcion: descripcion ?? null,
        orden: maxOrden + 1,
      },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Crear',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Punto tratado: ${titulo}`,
      cambioGenerado: descripcion || titulo,
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: punto };
  } catch (error) {
    console.error('Error al agregar punto:', error);
    return { success: false, error: 'Error al agregar punto', data: null };
  }
}

/**
 * Crear compromiso (opcionalmente asociado a una reunión; si no reunionId, es compromiso directo del coordinador)
 */
export async function addCompromiso(
  proyectoId: string,
  descripcion: string,
  opts?: {
    titulo?: string | null;
    reunionId?: string | null;
    fechaLimite?: Date;
    asignadoA?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const rol = await getRolUsuarioEnProyecto(user.id, proyectoId);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeCrear = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeCrear) {
      return {
        success: false,
        error: 'Solo el coordinador o un admin pueden agregar compromisos',
        data: null,
      };
    }

    const reunionId = opts?.reunionId ?? null;
    if (reunionId) {
      const reunion = await prisma.reunionSeguimiento.findUnique({
        where: { id: reunionId },
        select: { proyectoId: true },
      });
      if (!reunion || reunion.proyectoId !== proyectoId) {
        return { success: false, error: 'Reunión no encontrada', data: null };
      }
    }

    const compromiso = await prisma.compromisoProyecto.create({
      data: {
        reunionId,
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
    revalidatePath('/seguimiento');
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

    const rol = await getRolUsuarioEnProyecto(user.id, compromiso.proyectoId);
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
    revalidatePath('/seguimiento');
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
 * Marcar o desmarcar compromiso como completado (encargado/coordinador)
 */
export async function toggleCompromiso(compromisoId: string) {
  try {
    const compromiso = await prisma.compromisoProyecto.findUnique({
      where: { id: compromisoId },
      select: { proyectoId: true, completado: true, descripcion: true },
    });

    if (!compromiso) {
      return { success: false, error: 'Compromiso no encontrado', data: null };
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
    revalidatePath('/seguimiento');
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

    const rol = await getRolUsuarioEnProyecto(user.id, compromiso.proyectoId);
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
    revalidatePath('/seguimiento');
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
 * Marcar tarea Gantt como completada durante reunión y registrar
 */
export async function marcarTareaEnReunion(reunionId: string, taskId: string) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        activity: { select: { projectId: true, name: true } },
      },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    if (task.activity.projectId !== reunion.proyectoId) {
      return {
        success: false,
        error: 'La tarea no pertenece al proyecto de la reunión',
      };
    }

    if (!task.completed) {
      const toggleResult = await toggleTaskCompletion(taskId);
      if (!toggleResult.success) {
        return { success: false, error: toggleResult.error };
      }
    }

    await prisma.tareaMarcadaEnReunion.upsert({
      where: {
        reunionId_taskId: { reunionId, taskId },
      },
      create: { reunionId, taskId },
      update: {},
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true };
  } catch (error) {
    console.error('Error al marcar tarea en reunión:', error);
    return { success: false, error: 'Error al marcar tarea' };
  }
}

/**
 * Actualizar indicador durante reunión y registrar
 */
export async function actualizarIndicadorEnReunion(
  reunionId: string,
  indicadorId: string,
  valorNuevo: string
) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    const indicador = await prisma.indicador.findUnique({
      where: { id: indicadorId },
    });

    if (!indicador) {
      return { success: false, error: 'Indicador no encontrado' };
    }

    if (indicador.proyectoId !== reunion.proyectoId) {
      return {
        success: false,
        error: 'El indicador no pertenece al proyecto de la reunión',
      };
    }

    const valorAnterior = indicador.resultadoAlcanzado;
    const resultadoEsperado = parseValue(indicador.resultadoEsperado);
    const resultadoAlcanzado = parseValue(valorNuevo);

    const porcentajeCumplimiento =
      resultadoEsperado > 0
        ? Math.max(
            0,
            Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
          )
        : 0;
    const porcentajeAvance =
      resultadoEsperado > 0
        ? Math.max(
            0,
            Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
          )
        : 0;

    const updateResult = await updateIndicadorResultado(
      indicadorId,
      valorNuevo,
      porcentajeCumplimiento,
      porcentajeAvance
    );

    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    await prisma.indicadorActualizadoEnReunion.create({
      data: {
        reunionId,
        indicadorId,
        valorAnterior,
        valorNuevo,
      },
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar indicador en reunión:', error);
    return { success: false, error: 'Error al actualizar indicador' };
  }
}

/**
 * Agregar punto FODA (oportunidad o amenaza)
 */
export async function addPuntoFODA(
  reunionId: string,
  tipo: 'Oportunidad' | 'Amenaza',
  descripcion: string
) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const punto = await prisma.puntoFODA.create({
      data: { reunionId, tipo, descripcion },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Crear',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `${tipo}: ${descripcion.substring(0, 50)}...`,
      cambioGenerado: descripcion,
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: punto };
  } catch (error) {
    console.error('Error al agregar punto FODA:', error);
    return { success: false, error: 'Error al agregar punto FODA', data: null };
  }
}

/**
 * Agregar tema de presupuesto conversado
 */
export async function addTemaPresupuesto(
  reunionId: string,
  tema: string,
  descripcion?: string,
  cambioPropuesto?: string
) {
  try {
    const reunion = await prisma.reunionSeguimiento.findUnique({
      where: { id: reunionId },
      select: { proyectoId: true },
    });

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada', data: null };
    }

    const temaPresupuesto = await prisma.temaPresupuestoReunion.create({
      data: {
        reunionId,
        tema,
        descripcion: descripcion ?? null,
        cambioPropuesto: cambioPropuesto ?? null,
      },
    });

    await createHistorialEntry({
      proyectoId: reunion.proyectoId,
      accion: 'Crear',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `Tema presupuesto: ${tema}`,
      cambioGenerado: descripcion || tema,
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: temaPresupuesto };
  } catch (error) {
    console.error('Error al agregar tema presupuesto:', error);
    return {
      success: false,
      error: 'Error al agregar tema presupuesto',
      data: null,
    };
  }
}

// ========================
// Oportunidades y Amenazas (nivel proyecto)
// ========================

export async function getOportunidadesAmenazasProyecto(proyectoId: string) {
  try {
    const items = await prisma.oportunidadAmenaza.findMany({
      where: { proyectoId },
      orderBy: { createdAt: 'asc' },
      include: {
        okCoordinadorPor: {
          select: { id: true, name: true, image: true },
        },
      },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error('Error al obtener oportunidades/amenazas:', error);
    return {
      success: false,
      error: 'Error al obtener oportunidades y amenazas',
      data: [],
    };
  }
}

export async function createOportunidadAmenaza(
  proyectoId: string,
  tipo: 'Oportunidad' | 'Amenaza',
  nombre: string,
  descripcion: string
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const rol = await getRolUsuarioEnProyecto(user.id, proyectoId);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeCrear = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeCrear) {
      return {
        success: false,
        error:
          'Solo el coordinador o un admin pueden agregar oportunidades o amenazas',
        data: null,
      };
    }

    const item = await prisma.oportunidadAmenaza.create({
      data: { proyectoId, tipo, nombre: nombre.trim() || '', descripcion },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Crear',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: `${tipo}: ${(nombre || descripcion).substring(0, 50)}`,
      cambioGenerado: descripcion,
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error al crear oportunidad/amenaza:', error);
    return {
      success: false,
      error: 'Error al crear oportunidad o amenaza',
      data: null,
    };
  }
}

export async function updatePlanDeAccionOportunidadAmenaza(
  id: string,
  planDeAccion: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const item = await prisma.oportunidadAmenaza.findUnique({
      where: { id },
      select: { proyectoId: true, descripcion: true, planDeAccion: true },
    });
    if (!item) {
      return { success: false, error: 'No encontrado', data: null };
    }

    const rol = await getRolUsuarioEnProyecto(user.id, item.proyectoId);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeEditar =
      rol === 'Coordinador' || rol === 'Encargado' || activeRole === 'Admin';
    if (!puedeEditar) {
      return {
        success: false,
        error:
          'Solo coordinador, encargado o admin pueden editar el plan de acción',
        data: null,
      };
    }

    const updated = await prisma.oportunidadAmenaza.update({
      where: { id },
      data: { planDeAccion: planDeAccion ?? null },
    });

    await createHistorialEntry({
      proyectoId: item.proyectoId,
      accion: 'Plan de acción',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: item.descripcion?.substring(0, 50) ?? 'Oportunidad/Amenaza',
      cambioGenerado: planDeAccion
        ? (item.planDeAccion ? 'Plan de acción actualizado' : 'Plan de acción generado')
        : 'Plan de acción eliminado',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al actualizar plan de acción:', error);
    return {
      success: false,
      error: 'Error al actualizar plan de acción',
      data: null,
    };
  }
}

export async function toggleOkCoordinadorOportunidadAmenaza(id: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const item = await prisma.oportunidadAmenaza.findUnique({
      where: { id },
      select: { proyectoId: true, okCoordinador: true, descripcion: true },
    });
    if (!item) {
      return { success: false, error: 'No encontrado', data: null };
    }

    const rol = await getRolUsuarioEnProyecto(user.id, item.proyectoId);
    const activeRole = (user as { activeRole?: string | null }).activeRole;
    const puedeMarcarOk = rol === 'Coordinador' || activeRole === 'Admin';
    if (!puedeMarcarOk) {
      return {
        success: false,
        error: 'Solo el coordinador o un admin pueden marcar Ok',
        data: null,
      };
    }

    const nuevoOk = !item.okCoordinador;
    const updated = await prisma.oportunidadAmenaza.update({
      where: { id },
      data: {
        okCoordinador: nuevoOk,
        okCoordinadorPorId: nuevoOk ? user.id : null,
        okCoordinadorPorRolActivo: nuevoOk ? (activeRole ?? null) : null,
      },
    });

    await createHistorialEntry({
      proyectoId: item.proyectoId,
      accion: nuevoOk ? 'Validar plan (Ok coordinador)' : 'Quitar validación plan',
      tabProyecto: 'Seguimiento',
      elementoEspecifico: item.descripcion?.substring(0, 50) ?? 'Oportunidad/Amenaza',
      cambioGenerado: nuevoOk
        ? 'Coordinador marcó Ok (plan de acción validado)'
        : 'Validación Ok del coordinador quitada',
    });

    revalidatePath('/proyectos');
    revalidatePath('/seguimiento');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error al marcar Ok coordinador:', error);
    return {
      success: false,
      error: 'Error al marcar Ok',
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
 * Obtener reuniones de múltiples proyectos (para vista global)
 */
export async function getReunionesMultiplesProyectos(
  proyectoIds: string[],
  filtros?: ReunionSeguimientoFiltros
) {
  try {
    if (proyectoIds.length === 0) {
      return { success: true, data: [] };
    }

    const where: {
      proyectoId: { in: string[] };
      fecha?: object;
      coordinadorId?: string;
    } = {
      proyectoId: { in: proyectoIds },
    };

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) {
        (where.fecha as Record<string, Date>).gte = filtros.fechaDesde;
      }
      if (filtros.fechaHasta) {
        (where.fecha as Record<string, Date>).lte = filtros.fechaHasta;
      }
    }

    if (filtros?.coordinadorId) {
      where.coordinadorId = filtros.coordinadorId;
    }

    const reuniones = await prisma.reunionSeguimiento.findMany({
      where,
      include: {
        coordinador: {
          select: { id: true, name: true, email: true, image: true },
        },
        proyecto: {
          select: { id: true, proyecto: true },
        },
        _count: {
          select: {
            puntosTratados: true,
            compromisos: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 50,
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
 * Obtener compromisos pendientes de un proyecto (completado = false)
 */
export async function getCompromisosPendientesProyecto(proyectoId: string) {
  try {
    const compromisos = await prisma.compromisoProyecto.findMany({
      where: {
        proyectoId,
        completado: false,
      },
      include: {
        reunion: {
          select: {
            id: true,
            fecha: true,
            coordinador: { select: { name: true } },
          },
        },
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
      include: {
        reunion: {
          select: {
            id: true,
            fecha: true,
            coordinador: { select: { name: true } },
          },
        },
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
      where: { userId: user.id, rol: activeRole },
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
        reunion: {
          select: {
            id: true,
            fecha: true,
            coordinador: { select: { name: true } },
          },
        },
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

/**
 * Obtener próximas reuniones (fecha >= hoy) de los proyectos donde el usuario participa con el rol activo (portal Inicio).
 */
export async function getProximasReunionesParaUsuario(
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
      where: { userId: user.id, rol: activeRole },
      select: { proyectoId: true },
    });
    const proyectoIds = participaciones.map((p) => p.proyectoId);
    if (proyectoIds.length === 0) {
      return { success: true, data: [] };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const reuniones = await prisma.reunionSeguimiento.findMany({
      where: {
        proyectoId: { in: proyectoIds },
        fecha: { gte: hoy },
      },
      include: {
        proyecto: {
          select: { id: true, proyecto: true },
        },
        coordinador: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { fecha: 'asc' },
      take: limit,
    });

    return { success: true, data: reuniones };
  } catch (error) {
    console.error('Error al obtener próximas reuniones:', error);
    return {
      success: false,
      error: 'Error al obtener reuniones',
      data: [],
    };
  }
}
