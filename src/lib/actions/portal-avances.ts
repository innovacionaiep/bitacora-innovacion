'use server';

import prisma from '@/lib/prisma';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import { computeFondoAvanceMetrics } from '@/lib/fondo-avance-metrics';
import {
  canLoadPortalAvances,
  portalAvancesAppFondoNames,
  portalAvancesCanLoadAppFondos,
  sortEscuelaNames,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';
import { impulsaRowsToAvances } from '@/lib/portal-avances-impulsa';
import { readImpulsaStored } from '@/lib/portal-avances-impulsa-store';

export async function getPortalAvancesProyectos(): Promise<{
  success: boolean;
  data?: PortalAvancesProyecto[];
  error?: string;
}> {
  const access = await resolvePortalAccess();
  if (!canLoadPortalAvances(access.level, access.kind)) {
    return { success: false, error: 'No tienes acceso a esta vista' };
  }

  const data: PortalAvancesProyecto[] = [];

  if (portalAvancesCanLoadAppFondos(access.level, access.kind)) {
    const fondos = portalAvancesAppFondoNames();
    const rows = await prisma.proyecto.findMany({
      where: { fondo: { in: fondos } },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        sede: true,
        avanceGantt: true,
        objetivos: true,
        presupuestoAdjudicado: true,
        presupuestoTotal: true,
        escuelas: {
          select: { escuela: { select: { nombre: true } } },
        },
      },
      orderBy: { proyecto: 'asc' },
    });

    const proyectoIds = rows.map((p) => p.id);
    const itemsPresupuesto =
      proyectoIds.length > 0
        ? await prisma.itemPresupuesto.findMany({
            where: { proyectoId: { in: proyectoIds } },
            select: {
              proyectoId: true,
              cuenta: true,
              monto: true,
              estado: true,
              item: true,
            },
          })
        : [];

    const itemsByProyecto = new Map<string, typeof itemsPresupuesto>();
    for (const item of itemsPresupuesto) {
      const list = itemsByProyecto.get(item.proyectoId) ?? [];
      list.push(item);
      itemsByProyecto.set(item.proyectoId, list);
    }

    for (const p of rows) {
      const items = itemsByProyecto.get(p.id) ?? [];
      const metrics = computeFondoAvanceMetrics(p, items);
      data.push({
        id: p.id,
        fondo: p.fondo,
        proyecto: p.proyecto,
        sede: p.sede,
        escuelas: sortEscuelaNames(p.escuelas.map((e) => e.escuela.nombre)),
        ...metrics,
      });
    }
  }

  const impulsa = await readImpulsaStored();
  data.push(...impulsaRowsToAvances(impulsa.rows));

  return { success: true, data };
}
