'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type {
  CuentaPresupuesto,
  EstadoGastoPresupuesto,
} from '@prisma/client';
import type { ResumenPresupuesto, ResumenCuenta } from '@/types/presupuesto';

const CUENTAS: CuentaPresupuesto[] = ['RRHH', 'OPERACION', 'INVERSION'];

function computeResumenFromItems(
  items: Array<{ cuenta: CuentaPresupuesto; monto: number; estado: EstadoGastoPresupuesto }>,
  presupuestoTotalProyecto: number
): ResumenPresupuesto {
  const totalMonto = items.reduce((s, i) => s + i.monto, 0);
  const totalSolicitado = items
    .filter(
      (i) =>
        i.estado === 'SOLICITADO' ||
        i.estado === 'EN_PEDIDO' ||
        i.estado === 'EJECUTADO_OK'
    )
    .reduce((s, i) => s + i.monto, 0);
  const totalEnPedido = items
    .filter((i) => i.estado === 'EN_PEDIDO' || i.estado === 'EJECUTADO_OK')
    .reduce((s, i) => s + i.monto, 0);
  const totalEjecutado = items
    .filter((i) => i.estado === 'EJECUTADO_OK')
    .reduce((s, i) => s + i.monto, 0);

  const techo =
    presupuestoTotalProyecto > 0 ? presupuestoTotalProyecto : totalMonto || 1;
  const pctGlobalAvance =
    techo > 0 ? Math.round((totalEjecutado / techo) * 100) : 0;

  const porCuenta: ResumenCuenta[] = CUENTAS.map((cuenta) => {
    const filtrados = items.filter((i) => i.cuenta === cuenta);
    const monto = filtrados.reduce((s, i) => s + i.monto, 0);
    const montoSolicitado = filtrados
      .filter(
        (i) =>
          i.estado === 'SOLICITADO' ||
          i.estado === 'EN_PEDIDO' ||
          i.estado === 'EJECUTADO_OK'
      )
      .reduce((s, i) => s + i.monto, 0);
    const montoEnPedido = filtrados
      .filter(
        (i) => i.estado === 'EN_PEDIDO' || i.estado === 'EJECUTADO_OK'
      )
      .reduce((s, i) => s + i.monto, 0);
    const montoEjecutado = filtrados
      .filter((i) => i.estado === 'EJECUTADO_OK')
      .reduce((s, i) => s + i.monto, 0);

    const porcentajePeso = totalMonto > 0 ? (monto / totalMonto) * 100 : 0;
    const pctSolicitado = monto > 0 ? (montoSolicitado / monto) * 100 : 0;
    const pctEnPedido = monto > 0 ? (montoEnPedido / monto) * 100 : 0;
    const pctEjecutado = monto > 0 ? (montoEjecutado / monto) * 100 : 0;
    const pctTotal = techo > 0 ? (montoEjecutado / techo) * 100 : 0;

    return {
      cuenta,
      monto,
      porcentajePeso,
      montoSolicitado,
      montoEnPedido,
      montoEjecutado,
      pctSolicitado,
      pctEnPedido,
      pctEjecutado,
      pctTotal,
    };
  });

  return {
    totalMonto,
    totalSolicitado,
    totalEnPedido,
    totalEjecutado,
    pctGlobalAvance,
    porCuenta,
  };
}

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
    const [proyecto, presupuestoResult] = await Promise.all([
      prisma.proyecto.findUnique({
        where: { id: projectId },
        select: { presupuestoTotal: true },
      }),
      getPresupuestoByProyecto(projectId),
    ]);
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
    const presupuestoTotalProyecto = proyecto?.presupuestoTotal ?? 0;
    const resumen = computeResumenFromItems(items, presupuestoTotalProyecto);
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

export type ItemPresupuestoWithProyecciones = Awaited<
  ReturnType<typeof getPresupuestoByProyecto>
> extends { data: infer D }
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
    }>;
  };
  error?: string;
}> {
  try {
    const items = await prisma.itemPresupuesto.findMany({
      where: { proyectoId: projectId },
      include: {
        proyecciones: true,
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
      select: { proyectoId: true },
    });
    if (!item) {
      return { success: false, error: 'Ítem no encontrado' };
    }
    await prisma.itemPresupuesto.delete({
      where: { id },
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
    const mesesActuales = new Set(proyeccionesActuales.map(p => p.mes));
    const mesesNuevos = new Set(meses);

    // Eliminar proyecciones de meses que ya no están seleccionados
    const mesesAEliminar = [...mesesActuales].filter(m => !mesesNuevos.has(m));
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
