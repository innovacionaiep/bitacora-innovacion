'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { CuentaPresupuesto, EstadoGastoPresupuesto } from '@prisma/client';
import { createHistorialEntry } from './historial';
import { computeResumenPresupuesto } from '@/lib/utils/presupuesto-calculos';
import type { ResumenPresupuesto } from '@/types/presupuesto';

/**
 * Obtiene el resumen de presupuesto por cuenta para un proyecto (mismo cálculo que el tab Resumen).
 */
export async function getResumenPresupuestoProyecto(
  projectId: string
): Promise<{
  success: boolean;
  data?: ResumenPresupuesto;
  error?: string;
}> {
  try {
    const presupuestoResult = await getPresupuestoByProyecto(projectId);
    if (!presupuestoResult.success || !presupuestoResult.data) {
      return {
        success: false,
        error: presupuestoResult.error ?? 'Error al cargar presupuesto',
      };
    }
    const items = presupuestoResult.data.items.map((i) => ({
      cuenta: i.cuenta,
      monto: i.monto,
      estado: i.estado,
    }));
    const resumen = computeResumenPresupuesto(items);
    return { success: true, data: resumen };
  } catch (error) {
    console.error('Error getResumenPresupuestoProyecto:', error);
    return {
      success: false,
      error: 'Error al obtener resumen de presupuesto',
    };
  }
}

/**
 * Recalcula presupuestoTotal (suma de montos de todos los ítems) y presupuestoUsado
 * (suma de montos con estado EJECUTADO_OK) del proyecto y actualiza Proyecto.
 */
async function syncPresupuestoProyecto(projectId: string): Promise<void> {
  const items = await prisma.itemPresupuesto.findMany({
    where: { proyectoId: projectId },
    select: { monto: true, estado: true },
  });
  const presupuestoTotal = items.reduce((s, i) => s + i.monto, 0);
  const presupuestoUsado = items
    .filter((i) => i.estado === 'EJECUTADO_OK')
    .reduce((s, i) => s + i.monto, 0);
  await prisma.proyecto.update({
    where: { id: projectId },
    data: { presupuestoTotal, presupuestoUsado },
  });
}

export type ItemPresupuestoWithProyecciones =
  Awaited<ReturnType<typeof getPresupuestoByProyecto>> extends { data: infer D }
    ? D extends { items: infer I }
      ? I extends (infer U)[]
        ? U
        : never
      : never
    : never;

export interface CreateItemPresupuestoData {
  cuenta: CuentaPresupuesto;
  item: string;
  detalle?: string | null;
  monto: number;
  orden?: number;
}

export interface UpdateItemPresupuestoData {
  cuenta?: CuentaPresupuesto;
  item?: string;
  detalle?: string | null;
  monto?: number;
  estado?: EstadoGastoPresupuesto;
  idSolicitud?: string | null;
  idPedido?: string | null;
  idRecepcion?: string | null;
  orden?: number;
}

export async function getPresupuestoByProyecto(projectId: string): Promise<{
  success: boolean;
  data?: {
    items: Array<{
      id: string;
      proyectoId: string;
      cuenta: CuentaPresupuesto;
      item: string;
      detalle: string | null;
      monto: number;
      estado: EstadoGastoPresupuesto;
      idSolicitud: string | null;
      idPedido: string | null;
      idRecepcion: string | null;
      orden: number;
      proyecciones: Array<{
        id: string;
        mes: number;
        anio: number;
        monto: number;
      }>;
      comentariosCount: number;
    }>;
  };
  error?: string;
}> {
  try {
    const items = await prisma.itemPresupuesto.findMany({
      where: { proyectoId: projectId },
      include: {
        proyecciones: true,
        _count: {
          select: {
            comentarios: true,
          },
        },
      },
      orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      success: true,
      data: {
        items: items.map((i) => ({
          id: i.id,
          proyectoId: i.proyectoId,
          cuenta: i.cuenta,
          item: i.item,
          detalle: i.detalle,
          monto: i.monto,
          estado: i.estado,
          idSolicitud: i.idSolicitud,
          idPedido: i.idPedido,
          idRecepcion: i.idRecepcion,
          orden: i.orden,
          proyecciones: i.proyecciones.map((p) => ({
            id: p.id,
            mes: p.mes,
            anio: p.anio,
            monto: p.monto,
          })),
          comentariosCount: i._count.comentarios,
        })),
      },
    };
  } catch (error) {
    console.error('Error getPresupuestoByProyecto:', error);
    return {
      success: false,
      error: 'Error al obtener presupuesto del proyecto',
    };
  }
}

/** Obtiene un ítem de presupuesto por ID para el modal de detalle (portal, etc.) */
export async function getItemPresupuestoById(itemId: string): Promise<{
  success: boolean;
  data?: {
    id: string;
    proyectoId: string;
    cuenta: CuentaPresupuesto;
    item: string;
    detalle: string | null;
    monto: number;
    estado: EstadoGastoPresupuesto;
    idSolicitud: string | null;
    idPedido: string | null;
    idRecepcion: string | null;
    orden: number;
    proyecciones: Array<{ id: string; mes: number; anio: number; monto: number }>;
    comentariosCount: number;
  };
  error?: string;
}> {
  try {
    const i = await prisma.itemPresupuesto.findUnique({
      where: { id: itemId },
      include: {
        proyecciones: true,
        _count: { select: { comentarios: true } },
      },
    });
    if (!i) {
      return { success: false, error: 'Ítem de presupuesto no encontrado' };
    }
    return {
      success: true,
      data: {
        id: i.id,
        proyectoId: i.proyectoId,
        cuenta: i.cuenta,
        item: i.item,
        detalle: i.detalle,
        monto: i.monto,
        estado: i.estado,
        idSolicitud: i.idSolicitud,
        idPedido: i.idPedido,
        idRecepcion: i.idRecepcion,
        orden: i.orden,
        proyecciones: i.proyecciones.map((p) => ({
          id: p.id,
          mes: p.mes,
          anio: p.anio,
          monto: p.monto,
        })),
        comentariosCount: i._count.comentarios,
      },
    };
  } catch (error) {
    console.error('Error getItemPresupuestoById:', error);
    return {
      success: false,
      error: 'Error al obtener ítem de presupuesto',
    };
  }
}

export async function createItemPresupuesto(
  projectId: string,
  data: CreateItemPresupuestoData
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const maxOrden = await prisma.itemPresupuesto
      .aggregate({
        where: { proyectoId: projectId },
        _max: { orden: true },
      })
      .then((r) => r._max.orden ?? -1);

    const item = await prisma.itemPresupuesto.create({
      data: {
        proyectoId: projectId,
        cuenta: data.cuenta,
        item: data.item,
        detalle: data.detalle ?? null,
        monto: data.monto,
        orden: data.orden ?? maxOrden + 1,
      },
    });

    await createHistorialEntry({
      proyectoId: projectId,
      accion: 'Agregar gasto',
      tabProyecto: 'Presupuesto',
      elementoEspecifico: data.item,
      cambioGenerado: `Gasto creado: ${data.item} (${data.cuenta}, $${data.monto})`,
    });

    await syncPresupuestoProyecto(projectId);
    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    return { success: true, data: { id: item.id } };
  } catch (error) {
    console.error('Error createItemPresupuesto:', error);
    return {
      success: false,
      error: 'Error al crear ítem de presupuesto',
    };
  }
}

export async function updateItemPresupuesto(
  id: string,
  data: UpdateItemPresupuestoData
): Promise<{ success: boolean; error?: string }> {
  try {
    const itemBefore = await prisma.itemPresupuesto.findUnique({
      where: { id },
      select: { proyectoId: true, item: true, idSolicitud: true, idPedido: true, idRecepcion: true },
    });
    if (!itemBefore) {
      return { success: false, error: 'Ítem no encontrado' };
    }

    const updated = await prisma.itemPresupuesto.update({
      where: { id },
      data: {
        ...(data.cuenta !== undefined && { cuenta: data.cuenta }),
        ...(data.item !== undefined && { item: data.item }),
        ...(data.detalle !== undefined && { detalle: data.detalle }),
        ...(data.monto !== undefined && { monto: data.monto }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.idSolicitud !== undefined && {
          idSolicitud: data.idSolicitud,
        }),
        ...(data.idPedido !== undefined && { idPedido: data.idPedido }),
        ...(data.idRecepcion !== undefined && {
          idRecepcion: data.idRecepcion,
        }),
        ...(data.orden !== undefined && { orden: data.orden }),
      },
    });

    const partes: string[] = [];
    if (data.cuenta !== undefined || data.item !== undefined || data.detalle !== undefined || data.monto !== undefined || data.estado !== undefined) {
      partes.push('Información del gasto editada');
    }
    if (data.idSolicitud !== undefined) {
      partes.push(
        data.idSolicitud
          ? `Registrado ID de solicitud: ${data.idSolicitud}`
          : 'Eliminado ID de solicitud'
      );
    }
    if (data.idPedido !== undefined) {
      const ocId = updated.idPedido ?? data.idPedido;
      const solicitudId = updated.idSolicitud ?? itemBefore.idSolicitud;
      partes.push(
        data.idPedido
          ? `Registrado ID de OC: ${ocId}${solicitudId ? ` (asociado a solicitud ${solicitudId})` : ''}`
          : 'Eliminado ID de OC'
      );
    }
    if (data.idRecepcion !== undefined) {
      const ocId = updated.idPedido ?? itemBefore.idPedido;
      partes.push(
        data.idRecepcion
          ? `Registrado ID de recepción: ${data.idRecepcion} (asociado a OC ${ocId ?? '—'})`
          : 'Eliminado ID de recepción'
      );
    }
    if (partes.length > 0) {
      await createHistorialEntry({
        proyectoId: updated.proyectoId,
        accion: 'Actualizar',
        tabProyecto: 'Presupuesto',
        elementoEspecifico: updated.item,
        cambioGenerado: partes.join('; '),
      });
    }

    await syncPresupuestoProyecto(updated.proyectoId);
    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error updateItemPresupuesto:', error);
    return {
      success: false,
      error: 'Error al actualizar ítem de presupuesto',
    };
  }
}

export async function deleteItemPresupuesto(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const item = await prisma.itemPresupuesto.findUnique({
      where: { id },
      select: { proyectoId: true, item: true },
    });
    if (!item) {
      return { success: false, error: 'Ítem no encontrado' };
    }
    await prisma.itemPresupuesto.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: item.proyectoId,
      accion: 'Eliminar gasto',
      tabProyecto: 'Presupuesto',
      elementoEspecifico: item.item,
      cambioGenerado: 'Gasto eliminado del presupuesto',
    });

    await syncPresupuestoProyecto(item.proyectoId);
    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleteItemPresupuesto:', error);
    return {
      success: false,
      error: 'Error al eliminar ítem de presupuesto',
    };
  }
}

export async function setProyeccionMensual(
  itemPresupuestoId: string,
  mes: number,
  anio: number,
  monto: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.proyeccionPresupuesto.upsert({
      where: {
        itemPresupuestoId_mes_anio: { itemPresupuestoId, mes, anio },
      },
      create: { itemPresupuestoId, mes, anio, monto },
      update: { monto },
    });
    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error setProyeccionMensual:', error);
    return {
      success: false,
      error: 'Error al guardar proyección mensual',
    };
  }
}

export async function setProyeccionMensualMultiple(
  itemPresupuestoId: string,
  meses: number[],
  anio: number,
  montoPorMes: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener meses actuales para este item y año
    const proyeccionesActuales = await prisma.proyeccionPresupuesto.findMany({
      where: { itemPresupuestoId, anio },
      select: { mes: true },
    });
    const mesesActuales = new Set(proyeccionesActuales.map((p) => p.mes));
    const mesesNuevos = new Set(meses);

    // Eliminar proyecciones de meses que ya no están seleccionados
    const mesesAEliminar = [...mesesActuales].filter(
      (m) => !mesesNuevos.has(m)
    );
    if (mesesAEliminar.length > 0) {
      await prisma.proyeccionPresupuesto.deleteMany({
        where: {
          itemPresupuestoId,
          anio,
          mes: { in: mesesAEliminar },
        },
      });
    }

    // Crear o actualizar proyecciones para los meses seleccionados
    for (const mes of meses) {
      await prisma.proyeccionPresupuesto.upsert({
        where: {
          itemPresupuestoId_mes_anio: { itemPresupuestoId, mes, anio },
        },
        create: { itemPresupuestoId, mes, anio, monto: montoPorMes },
        update: { monto: montoPorMes },
      });
    }

    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error setProyeccionMensualMultiple:', error);
    return {
      success: false,
      error: 'Error al guardar proyecciones mensuales',
    };
  }
}
