'use server';

import { requireProjectAccess } from '@/lib/authz/guards';
import prisma from '@/lib/prisma';
import { getActivities, type ActivityWithTasks } from '@/lib/actions/gantt';
import {
  getIndicadoresByProyecto,
  type IndicadoresProyectoData,
} from '@/lib/actions/indicadores';
import { getPresupuestoByProyecto } from '@/lib/actions/presupuesto';
import { getHistorialProyecto } from '@/lib/actions/historial';
import { getCompromisosProyecto } from '@/lib/actions/seguimiento';
import { getProyectoParticipantes } from '@/lib/actions/proyectos';
import {
  computeDeltaSaldo,
  computeResumenPresupuesto,
  isDeltaPresupuestoItem,
  mergeDeltaEnResumen,
} from '@/lib/utils/presupuesto-calculos';
import type { ResumenPresupuesto, ItemPresupuestoItem } from '@/types/presupuesto';

const HISTORIAL_LIMIT = 10;

export type ResumenTabData = {
  activities: ActivityWithTasks[];
  indicadores: IndicadoresProyectoData;
  presupuestoItems: ItemPresupuestoItem[];
  resumenPresupuesto: ResumenPresupuesto;
  compromisos: NonNullable<
    Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
  >;
  historial: NonNullable<
    Awaited<ReturnType<typeof getHistorialProyecto>>['data']
  >;
  participantes: NonNullable<
    Awaited<ReturnType<typeof getProyectoParticipantes>>['data']
  >;
};

/**
 * Un solo round-trip para el tab Resumen. Siembra caches RQ de tabs relacionados.
 */
export async function getResumenTabData(proyectoId: string): Promise<{
  success: boolean;
  data?: ResumenTabData;
  error?: string;
}> {
  const gate = await requireProjectAccess(proyectoId);
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const [
    activitiesResult,
    indicadoresResult,
    presupuestoResult,
    compromisosResult,
    historialResult,
    participantesResult,
    proyectoMeta,
  ] = await Promise.all([
    getActivities(proyectoId),
    getIndicadoresByProyecto(proyectoId),
    getPresupuestoByProyecto(proyectoId),
    getCompromisosProyecto(proyectoId),
    getHistorialProyecto(proyectoId, undefined, HISTORIAL_LIMIT),
    getProyectoParticipantes(proyectoId),
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { presupuestoAdjudicado: true },
    }),
  ]);

  if (!activitiesResult.success || !activitiesResult.data) {
    return {
      success: false,
      error: activitiesResult.error ?? 'Error al cargar actividades',
    };
  }
  if (!indicadoresResult.success || !indicadoresResult.data) {
    return {
      success: false,
      error: indicadoresResult.error ?? 'Error al cargar indicadores',
    };
  }
  if (!presupuestoResult.success || !presupuestoResult.data) {
    return {
      success: false,
      error: presupuestoResult.error ?? 'Error al cargar presupuesto',
    };
  }
  if (!historialResult.success || !historialResult.data) {
    return {
      success: false,
      error: historialResult.error ?? 'Error al cargar historial',
    };
  }

  const presupuestoItems = presupuestoResult.data.items.map((i) => ({
    ...i,
    comentariosCount: i.comentariosCount,
  })) as ItemPresupuestoItem[];
  const presupuestoAdjudicado = proyectoMeta?.presupuestoAdjudicado ?? 0;
  const itemsGasto = presupuestoItems.filter((i) => !isDeltaPresupuestoItem(i));
  const resumenBase = computeResumenPresupuesto(itemsGasto);
  const delta = computeDeltaSaldo(presupuestoAdjudicado, itemsGasto);
  const resumenPresupuesto = mergeDeltaEnResumen(resumenBase, delta);

  return {
    success: true,
    data: {
      activities: activitiesResult.data as ActivityWithTasks[],
      indicadores: indicadoresResult.data,
      presupuestoItems,
      resumenPresupuesto,
      compromisos:
        compromisosResult.success && compromisosResult.data
          ? compromisosResult.data
          : [],
      historial: historialResult.data,
      participantes:
        participantesResult.success && participantesResult.data
          ? participantesResult.data
          : [],
    },
  };
}
