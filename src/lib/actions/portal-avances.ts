'use server';

import prisma from '@/lib/prisma';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import { computeFondoAvanceMetrics } from '@/lib/fondo-avance-metrics';
import {
  canLoadPortalAvances,
  countPortalAvancesParticipantes,
  portalAvancesAppFondoNames,
  portalAvancesCanLoadAppFondos,
  portalAvancesLevelCanSeeFondo,
  sortEscuelaNames,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';
import {
  impulsaRowsToAvances,
  PORTAL_AVANCES_IMPULSA_FONDO,
  PORTAL_AVANCES_VCM_FONDO,
} from '@/lib/portal-avances-impulsa';
import {
  readImpulsaStored,
  readVcmStored,
} from '@/lib/portal-avances-impulsa-store';

export async function getPortalAvancesProyectos(): Promise<{
  success: boolean;
  data?: PortalAvancesProyecto[];
  error?: string;
}> {
  const access = await resolvePortalAccess();
  if (!canLoadPortalAvances(access.level, access.kind, access.profile)) {
    return { success: false, error: 'No tienes acceso a esta vista' };
  }

  const data: PortalAvancesProyecto[] = [];

  if (portalAvancesCanLoadAppFondos(access.level, access.kind, access.profile)) {
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
        carreras: {
          select: { carrera: { select: { nombre: true } } },
        },
        asignaturas: {
          select: { asignatura: { select: { nombre: true } } },
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

    const participantes =
      proyectoIds.length > 0
        ? await prisma.proyectoParticipante.findMany({
            where: { proyectoId: { in: proyectoIds } },
            select: { proyectoId: true, rol: true, cargo: true },
          })
        : [];
    const countsByProyecto = countPortalAvancesParticipantes(participantes);

    for (const p of rows) {
      const items = itemsByProyecto.get(p.id) ?? [];
      const metrics = computeFondoAvanceMetrics(p, items);
      const counts = countsByProyecto.get(p.id);
      data.push({
        id: p.id,
        fondo: p.fondo,
        proyecto: p.proyecto,
        sede: p.sede,
        escuelas: sortEscuelaNames(p.escuelas.map((e) => e.escuela.nombre)),
        carreras: sortEscuelaNames(p.carreras.map((c) => c.carrera.nombre)),
        asignaturas: sortEscuelaNames(
          p.asignaturas.map((a) => a.asignatura.nombre),
        ),
        estudiantes: counts?.estudiantes ?? 0,
        docentes: counts?.docentes ?? 0,
        beneficiarios: counts?.beneficiarios ?? 0,
        ...metrics,
      });
    }
  }

  const impulsa = await readImpulsaStored();
  if (
    portalAvancesLevelCanSeeFondo(
      access.level,
      PORTAL_AVANCES_IMPULSA_FONDO,
      access.profile,
      access.kind,
    )
  ) {
    data.push(...impulsaRowsToAvances(impulsa.rows));
  }

  if (
    portalAvancesLevelCanSeeFondo(
      access.level,
      PORTAL_AVANCES_VCM_FONDO,
      access.profile,
      access.kind,
    )
  ) {
    const vcm = await readVcmStored();
    data.push(
      ...impulsaRowsToAvances(vcm.rows, {
        fondo: PORTAL_AVANCES_VCM_FONDO,
        idPrefix: 'vcm',
      }),
    );
  }

  return { success: true, data };
}
