'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyConfigUnlock } from '@/lib/actions/configuracion-usuarios';
import { deleteProyecto } from '@/lib/actions/proyectos';

export type ProyectoParticipanteRow = {
  nombre: string;
  rol: string;
};

export type ProyectoEscuelaRow = {
  id: string;
  nombre: string;
};

export type ProyectoListRow = {
  id: string;
  proyecto: string;
  fondo: string;
  linea: string | null;
  sede: string;
  escuelas: ProyectoEscuelaRow[];
  participantes: ProyectoParticipanteRow[];
  createdAt: Date;
};

export type ProyectoCamposConfigUpdate = {
  proyecto?: string;
  fondo?: string;
  linea?: string | null;
  sede?: string;
  escuelasIds?: string[];
};

/**
 * Listar todos los proyectos para el panel de configuración (solo Admin).
 */
export async function listProyectosConfig(): Promise<{
  success: boolean;
  data?: ProyectoListRow[];
  error?: string;
}> {
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        linea: true,
        sede: true,
        createdAt: true,
        escuelas: {
          include: {
            escuela: { select: { id: true, nombre: true } },
          },
        },
        participantes_rel: {
          select: {
            id: true,
            rol: true,
            nombre: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const data: ProyectoListRow[] = proyectos.map((p) => ({
      id: p.id,
      proyecto: p.proyecto,
      fondo: p.fondo,
      linea: p.linea,
      sede: p.sede,
      createdAt: p.createdAt,
      escuelas: p.escuelas.map((e) => ({
        id: e.escuela.id,
        nombre: e.escuela.nombre,
      })),
      participantes: p.participantes_rel.map((part) => ({
        nombre: part.nombre?.trim() || part.user?.name?.trim() || 'Sin nombre',
        rol: part.rol,
      })),
    }));

    return { success: true, data };
  } catch (e) {
    console.error('listProyectosConfig:', e);
    return { success: false, error: 'Error al listar proyectos' };
  }
}

/**
 * Eliminar un proyecto y todo su contenido (cascade). Requiere contraseña de desbloqueo "bitacora".
 */
export async function deleteProyectoConfig(
  proyectoId: string,
  unlockPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyConfigUnlock(unlockPassword);
  if (!verified.success) {
    return { success: false, error: verified.error ?? 'Contraseña incorrecta' };
  }
  const result = await deleteProyecto(proyectoId);
  if (result.success) {
    revalidatePath('/configuracion/proyectos');
    revalidatePath('/configuracion/usuarios');
    revalidatePath('/proyectos');
  }
  return result;
}

/**
 * Actualizar el fondo de un proyecto desde el panel de configuración.
 * @deprecated Preferir updateProyectoCamposConfig
 */
export async function updateProyectoFondoConfig(
  proyectoId: string,
  fondo: string
): Promise<{ success: boolean; error?: string }> {
  return updateProyectoCamposConfig(proyectoId, { fondo });
}

/**
 * Actualizar campos editables del proyecto desde Configuración → Proyectos.
 */
export async function updateProyectoCamposConfig(
  proyectoId: string,
  campos: ProyectoCamposConfigUpdate
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, fondo: true, linea: true },
    });
    if (!existing) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const data: {
      proyecto?: string;
      fondo?: string;
      linea?: string | null;
      sede?: string;
    } = {};

    if (campos.proyecto !== undefined) {
      const nombre = campos.proyecto.trim();
      if (!nombre) {
        return { success: false, error: 'El nombre del proyecto es obligatorio' };
      }
      data.proyecto = nombre;
    }

    if (campos.fondo !== undefined) {
      const fondo = campos.fondo.trim();
      if (!fondo) {
        return { success: false, error: 'El fondo es obligatorio' };
      }
      data.fondo = fondo;
    }

    if (campos.sede !== undefined) {
      data.sede = campos.sede.trim();
    }

    const nextFondo = data.fondo ?? existing.fondo;
    let nextLinea: string | null | undefined = campos.linea;

    if (campos.linea !== undefined) {
      const lineaTrim = campos.linea?.trim() || null;
      nextLinea = lineaTrim;
    }

    // Si cambió el fondo, limpiar línea si no pertenece al nuevo fondo
    if (data.fondo !== undefined && data.fondo !== existing.fondo) {
      const lineaActual =
        nextLinea !== undefined ? nextLinea : existing.linea;
      if (lineaActual) {
        const lineaValida = await prisma.linea.findFirst({
          where: {
            nombre: lineaActual,
            fondo: { nombre: nextFondo },
          },
          select: { id: true },
        });
        if (!lineaValida) {
          nextLinea = null;
        }
      }
    }

    if (nextLinea !== undefined) {
      data.linea = nextLinea;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.proyecto.update({
          where: { id: proyectoId },
          data,
        });
      }

      if (campos.escuelasIds !== undefined) {
        await tx.proyectoEscuela.deleteMany({
          where: { proyectoId },
        });
        if (campos.escuelasIds.length > 0) {
          await tx.proyectoEscuela.createMany({
            data: campos.escuelasIds.map((escuelaId) => ({
              proyectoId,
              escuelaId,
            })),
          });
        }
      }
    });

    revalidatePath('/configuracion/proyectos');
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error('updateProyectoCamposConfig:', e);
    return { success: false, error: 'Error al actualizar el proyecto' };
  }
}
