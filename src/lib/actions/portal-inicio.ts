'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCompromisosPendientesParaUsuario } from '@/lib/actions/seguimiento';
import { getHistorialRecienteParaUsuario } from '@/lib/actions/historial';
import {
  computeAvancePresupuestoPct,
  computeDeltaSaldo,
  formatPresupuestoMonto,
  isDeltaPresupuestoItem,
} from '@/lib/utils/presupuesto-calculos';
import { ROLES_ALERTAS_PORTAL } from '@/lib/portal-constants';

/**
 * Obtener los roles para los que el usuario tiene al menos un proyecto (roles con proyectos vigentes).
 */
export async function getRolesConProyectosVigentes() {
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
                  userId: null,
                  email: { equals: user.email, mode: 'insensitive' as const },
                },
              ]
            : []),
        ],
      },
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
 * Participaciones del usuario (cualquier rol) — proyectoId + rol.
 */
async function getParticipacionesUsuario(user: {
  id: string;
  email?: string | null;
}) {
  return prisma.proyectoParticipante.findMany({
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
    select: { proyectoId: true, rol: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Proyectos donde el usuario participa (todos los roles), con columna de rol.
 * Internals accept preloaded participaciones to avoid duplicate auth/DB work.
 */
export async function getProyectosDelUsuarioConRol(_ignored?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }
    const participaciones = await getParticipacionesUsuario(user);
    return {
      success: true,
      data: await buildProyectosConRolFromParticipaciones(participaciones),
    };
  } catch (error) {
    console.error('Error al obtener proyectos del usuario por rol:', error);
    return {
      success: false,
      error: 'Error al obtener proyectos',
      data: [],
    };
  }
}

type ParticipacionRow = { proyectoId: string; rol: string };

async function buildProyectosConRolFromParticipaciones(
  participaciones: Array<{ proyectoId: string; rol: string | null }>
) {
  const normalized: ParticipacionRow[] = participaciones.map((p) => ({
    proyectoId: p.proyectoId,
    rol: p.rol ?? '',
  }));
  const proyectoIds = [...new Set(normalized.map((p) => p.proyectoId))];
  if (proyectoIds.length === 0) return [];

  const [proyectos, avgIndicadores, itemsPresupuesto] = await Promise.all([
    prisma.proyecto.findMany({
      where: { id: { in: proyectoIds } },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        avanceGantt: true,
        presupuestoAdjudicado: true,
      },
    }),
    prisma.indicador.groupBy({
      by: ['proyectoId'],
      where: { proyectoId: { in: proyectoIds } },
      _avg: { porcentajeAvance: true },
    }),
    prisma.itemPresupuesto.findMany({
      where: { proyectoId: { in: proyectoIds } },
      select: {
        proyectoId: true,
        cuenta: true,
        monto: true,
        estado: true,
        item: true,
      },
    }),
  ]);

  const proyectoById = new Map(proyectos.map((p) => [p.id, p]));
  const avgByProyecto = new Map(
    avgIndicadores.map((r) => [
      r.proyectoId,
      r._avg.porcentajeAvance != null
        ? Math.round(r._avg.porcentajeAvance * 100) / 100
        : 0,
    ])
  );
  const itemsByProyecto = new Map<string, typeof itemsPresupuesto>();
  for (const item of itemsPresupuesto) {
    const list = itemsByProyecto.get(item.proyectoId) ?? [];
    list.push(item);
    itemsByProyecto.set(item.proyectoId, list);
  }

  return normalized
    .map((p) => {
      const proy = proyectoById.get(p.proyectoId);
      if (!proy) return null;
      return {
        id: proy.id,
        proyecto: proy.proyecto,
        fondo: proy.fondo,
        avanceGantt: proy.avanceGantt,
        avanceIndicadores: avgByProyecto.get(proy.id) ?? 0,
        avancePresupuesto: computeAvancePresupuestoPct(
          itemsByProyecto.get(proy.id) ?? [],
          proy.presupuestoAdjudicado ?? 0
        ),
        rol: p.rol,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export type AlertaPresupuestoItem = {
  id: string;
  item: string;
  proyectoId: string;
  proyectoNombre: string;
  detalle?: string | null;
  /** Fila virtual DELTA del tab Presupuesto (no es ItemPresupuesto en BD). */
  isDelta?: boolean;
  montoLabel?: string;
};

export type AlertaActividadItem = {
  id: string;
  name: string;
  proyectoId: string;
  proyectoNombre: string;
  porcentaje: number;
};

export type AlertaIndicadorItem = {
  id: string;
  nombre: string;
  proyectoId: string;
  proyectoNombre: string;
  porcentaje: number;
};

export type AlertaActividadAtrasadaItem = {
  id: string;
  name: string;
  proyectoId: string;
  proyectoNombre: string;
  porcentaje: number;
  tareasAtrasadas: number;
};

/** Payload plano de alertas del portal (mismas listas para todos los roles del portal). */
export interface AlertasPortal {
  presupuestoPorSolicitar: AlertaPresupuestoItem[];
  actividadesPorEvidenciar: AlertaActividadItem[];
  indicadoresPorEvidenciar: AlertaIndicadorItem[];
  actividadesAtrasadas: AlertaActividadAtrasadaItem[];
  /** Rol de participación del usuario por proyecto (para atribuciones por ítem). */
  miRolPorProyecto?: Record<string, string>;
}

const LIMITE_ALERTAS_PORTAL = 100;
const MIN_AVANCE_POR_EVIDENCIAR = 60;

function emptyAlertasPortal(): AlertasPortal {
  return {
    presupuestoPorSolicitar: [],
    actividadesPorEvidenciar: [],
    indicadoresPorEvidenciar: [],
    actividadesAtrasadas: [],
    miRolPorProyecto: {},
  };
}

/** YYYY-MM-DD local (evita shift UTC al comparar endDate de tareas). */
function todayLocalYmd(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchPresupuestoPorSolicitar(proyectoIds: string[]) {
  const [presupuesto, proyectos] = await Promise.all([
    prisma.itemPresupuesto.findMany({
      where: {
        proyectoId: { in: proyectoIds },
        OR: [{ idSolicitud: null }, { idSolicitud: '' }],
      },
      select: {
        id: true,
        item: true,
        detalle: true,
        monto: true,
        proyectoId: true,
        proyecto: { select: { proyecto: true } },
      },
      take: LIMITE_ALERTAS_PORTAL,
    }),
    prisma.proyecto.findMany({
      where: { id: { in: proyectoIds } },
      select: {
        id: true,
        proyecto: true,
        presupuestoAdjudicado: true,
        itemsPresupuesto: { select: { item: true, monto: true } },
      },
    }),
  ]);

  const reales: AlertaPresupuestoItem[] = presupuesto
    .filter((p) => !isDeltaPresupuestoItem(p))
    .map((p) => ({
      id: p.id,
      item: p.item,
      detalle: p.detalle,
      proyectoId: p.proyectoId,
      proyectoNombre: p.proyecto?.proyecto ?? '',
      isDelta: false,
      montoLabel: formatPresupuestoMonto(p.monto),
    }));

  const deltas: AlertaPresupuestoItem[] = [];
  for (const proy of proyectos) {
    const delta = computeDeltaSaldo(
      proy.presupuestoAdjudicado ?? 0,
      proy.itemsPresupuesto
    );
    if (delta === 0) continue;
    deltas.push({
      id: `delta:${proy.id}`,
      item: 'DELTA',
      detalle: delta >= 0 ? 'Saldo a favor' : 'Saldo en contra',
      proyectoId: proy.id,
      proyectoNombre: proy.proyecto,
      isDelta: true,
      montoLabel: formatPresupuestoMonto(delta),
    });
  }

  return [...deltas, ...reales].slice(0, LIMITE_ALERTAS_PORTAL);
}

/**
 * Actividades con al menos una tarea cuya fecha fin ya pasó y aún no está completada.
 */
async function fetchActividadesAtrasadas(proyectoIds: string[]) {
  const todayStr = todayLocalYmd();
  const activities = await prisma.activity.findMany({
    where: {
      projectId: { in: proyectoIds },
      tasks: {
        some: {
          completed: false,
          endDate: { lt: todayStr },
        },
      },
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      progress: true,
      project: { select: { proyecto: true } },
      tasks: {
        where: {
          completed: false,
          endDate: { lt: todayStr },
        },
        select: { id: true },
      },
    },
    take: LIMITE_ALERTAS_PORTAL,
  });
  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    proyectoId: a.projectId,
    proyectoNombre: a.project?.proyecto ?? '',
    porcentaje: a.progress ?? 0,
    tareasAtrasadas: a.tasks.length,
  }));
}

async function fetchAlertasPorEvidenciar(proyectoIds: string[]) {
  const [actividades, indicadores] = await Promise.all([
    prisma.activity.findMany({
      where: {
        projectId: { in: proyectoIds },
        evidencias: { none: {} },
        progress: { gte: MIN_AVANCE_POR_EVIDENCIAR },
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        progress: true,
        project: { select: { proyecto: true } },
      },
      take: LIMITE_ALERTAS_PORTAL,
    }),
    prisma.indicador.findMany({
      where: {
        proyectoId: { in: proyectoIds },
        evidencias: { none: {} },
        porcentajeCumplimiento: { gte: MIN_AVANCE_POR_EVIDENCIAR },
      },
      select: {
        id: true,
        nombre: true,
        proyectoId: true,
        porcentajeAvance: true,
        porcentajeCumplimiento: true,
        proyecto: { select: { proyecto: true } },
      },
      take: LIMITE_ALERTAS_PORTAL,
    }),
  ]);

  return {
    actividadesPorEvidenciar: actividades.map((a) => ({
      id: a.id,
      name: a.name,
      proyectoId: a.projectId,
      proyectoNombre: a.project?.proyecto ?? '',
      porcentaje: a.progress ?? 0,
    })),
    indicadoresPorEvidenciar: indicadores.map((i) => ({
      id: i.id,
      nombre: i.nombre,
      proyectoId: i.proyectoId,
      proyectoNombre: i.proyecto?.proyecto ?? '',
      porcentaje: Number(i.porcentajeAvance ?? 0),
    })),
  };
}

/**
 * Alertas del portal para todos los proyectos donde el usuario participa
 * con un rol de ROLES_ALERTAS_PORTAL. Incluye miRolPorProyecto para UI.
 */
export async function getAlertasPortalUsuario(_ignored?: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }
    const participaciones = await getParticipacionesUsuario(user);
    return {
      success: true,
      data: await buildAlertasFromParticipaciones(participaciones),
    };
  } catch (error) {
    console.error('Error al obtener alertas del portal:', error);
    return {
      success: false,
      error: 'Error al obtener alertas',
      data: null,
    };
  }
}

async function buildAlertasFromParticipaciones(
  participaciones: Array<{ proyectoId: string; rol: string | null }>
): Promise<AlertasPortal> {
  const miRolPorProyecto: Record<string, string> = {};
  const proyectoIds: string[] = [];
  for (const p of participaciones) {
    const rol = p.rol ?? '';
    if (
      (ROLES_ALERTAS_PORTAL as readonly string[]).includes(rol) &&
      !miRolPorProyecto[p.proyectoId]
    ) {
      miRolPorProyecto[p.proyectoId] = rol;
      proyectoIds.push(p.proyectoId);
    }
  }

  if (proyectoIds.length === 0) {
    return { ...emptyAlertasPortal(), miRolPorProyecto: {} };
  }

  const [porEvidenciar, presupuesto, atrasadas] = await Promise.all([
    fetchAlertasPorEvidenciar(proyectoIds),
    fetchPresupuestoPorSolicitar(proyectoIds),
    fetchActividadesAtrasadas(proyectoIds),
  ]);

  return {
    actividadesPorEvidenciar: porEvidenciar.actividadesPorEvidenciar,
    indicadoresPorEvidenciar: porEvidenciar.indicadoresPorEvidenciar,
    presupuestoPorSolicitar: presupuesto,
    actividadesAtrasadas: atrasadas,
    miRolPorProyecto,
  };
}

async function fetchCompromisosForProyectoIds(proyectoIds: string[]) {
  if (proyectoIds.length === 0) return [];
  const rows = await prisma.compromisoProyecto.findMany({
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
  // Plain JSON for RSC → Client (avoids Date / class prototype issues in production)
  return rows.map((c) => ({
    ...c,
    fechaLimite: c.fechaLimite?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

async function fetchHistorialForProyectoIds(proyectoIds: string[], limit = 10) {
  if (proyectoIds.length === 0) return [];
  const rows = await prisma.historialProyecto.findMany({
    where: { proyectoId: { in: proyectoIds } },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      proyecto: {
        select: { id: true, proyecto: true },
      },
    },
    orderBy: { fecha: 'desc' },
  });
  return rows.map((h) => ({
    ...h,
    fecha: h.fecha.toISOString(),
    createdAt: h.createdAt.toISOString(),
  }));
}

export type InicioInitialData = {
  role: string | null;
  proyectos: Awaited<ReturnType<typeof getProyectosDelUsuarioConRol>>['data'];
  alertas: Awaited<ReturnType<typeof getAlertasPortalUsuario>>['data'];
  compromisos: Awaited<
    ReturnType<typeof getCompromisosPendientesParaUsuario>
  >['data'];
  historial: Awaited<ReturnType<typeof getHistorialRecienteParaUsuario>>['data'];
};

/**
 * Carga inicial del portal de inicio: 1× auth + 1× participaciones + widgets en paralelo.
 * Nunca lanza: un fallo de BD/timeout degrada a null y el client puede refetch.
 */
export async function getInicioInitialData(
  _ignored?: string | null
): Promise<InicioInitialData | null> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return null;

    const participaciones = await getParticipacionesUsuario(user);
    const proyectoIds = [...new Set(participaciones.map((p) => p.proyectoId))];

    const [proyectos, alertas, compromisos, historial] = await Promise.all([
      buildProyectosConRolFromParticipaciones(participaciones),
      buildAlertasFromParticipaciones(participaciones),
      fetchCompromisosForProyectoIds(proyectoIds),
      fetchHistorialForProyectoIds(proyectoIds, 10),
    ]);

    return {
      role: null,
      proyectos,
      alertas,
      compromisos: compromisos as InicioInitialData['compromisos'],
      historial: historial as InicioInitialData['historial'],
    };
  } catch (error) {
    console.error('[getInicioInitialData] Error:', error);
    return null;
  }
}
