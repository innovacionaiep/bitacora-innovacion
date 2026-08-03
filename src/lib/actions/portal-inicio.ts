'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { getCompromisosPendientesParaUsuario } from '@/lib/actions/seguimiento';
import { getHistorialRecienteParaUsuario } from '@/lib/actions/historial';
import { computeAvancePresupuestoPct } from '@/lib/utils/presupuesto-calculos';
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
 * Obtener proyectoIds donde el usuario participa con el rol activo.
 * Función interna para reutilizar en otras actions del portal.
 */
async function getProyectoIdsPorRol(
  user: { id: string; email?: string | null },
  activeRole: string | null
) {
  if (!activeRole) return [];
  const list = await prisma.proyectoParticipante.findMany({
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
  return list.map((p) => p.proyectoId);
}

/**
 * Proyectos donde el usuario participa con el rol activo (id, nombre, avanceGantt, rol).
 */
export async function getProyectosDelUsuarioConRol(activeRole: string | null) {
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
      include: {
        proyecto: {
          select: {
            id: true,
            proyecto: true,
            fondo: true,
            avanceGantt: true,
            presupuestoAdjudicado: true,
            indicadores: { select: { porcentajeAvance: true } },
          },
        },
      },
    });

    const proyectoIds = participaciones
      .map((p) => p.proyecto?.id)
      .filter((id): id is string => Boolean(id));

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

    const itemsByProyecto = new Map<
      string,
      Array<{
        proyectoId: string;
        cuenta: (typeof itemsPresupuesto)[number]['cuenta'];
        monto: number;
        estado: (typeof itemsPresupuesto)[number]['estado'];
        item: string;
      }>
    >();
    for (const item of itemsPresupuesto) {
      const list = itemsByProyecto.get(item.proyectoId) ?? [];
      list.push(item);
      itemsByProyecto.set(item.proyectoId, list);
    }

    const data = participaciones
      .filter((p) => p.proyecto)
      .map((p) => {
        const proy = p.proyecto!;
        const indicadores = proy.indicadores ?? [];
        const avanceIndicadores =
          indicadores.length > 0
            ? Math.round(
                (indicadores.reduce((s, i) => s + i.porcentajeAvance, 0) /
                  indicadores.length) *
                  100
              ) / 100
            : 0;
        const avancePresupuesto = computeAvancePresupuestoPct(
          itemsByProyecto.get(proy.id) ?? [],
          proy.presupuestoAdjudicado ?? 0
        );
        return {
          id: proy.id,
          proyecto: proy.proyecto,
          fondo: proy.fondo,
          avanceGantt: proy.avanceGantt,
          avanceIndicadores,
          avancePresupuesto,
          rol: p.rol,
        };
      });

    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener proyectos del usuario por rol:', error);
    return {
      success: false,
      error: 'Error al obtener proyectos',
      data: [],
    };
  }
}

export type AlertaPresupuestoItem = {
  id: string;
  item: string;
  proyectoId: string;
  proyectoNombre: string;
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
}

const LIMITE_ALERTAS_PORTAL = 100;
const MIN_AVANCE_POR_EVIDENCIAR = 60;

function emptyAlertasPortal(): AlertasPortal {
  return {
    presupuestoPorSolicitar: [],
    actividadesPorEvidenciar: [],
    indicadoresPorEvidenciar: [],
    actividadesAtrasadas: [],
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
  const presupuesto = await prisma.itemPresupuesto.findMany({
    where: {
      proyectoId: { in: proyectoIds },
      idSolicitud: null,
    },
    select: {
      id: true,
      item: true,
      proyectoId: true,
      proyecto: { select: { proyecto: true } },
    },
    take: LIMITE_ALERTAS_PORTAL,
  });
  return presupuesto.map((p) => ({
    id: p.id,
    item: p.item,
    proyectoId: p.proyectoId,
    proyectoNombre: p.proyecto?.proyecto ?? '',
  }));
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
    actividadesPorEvidenciar: actividades
      .filter((a) => (a.progress ?? 0) >= MIN_AVANCE_POR_EVIDENCIAR)
      .map((a) => ({
        id: a.id,
        name: a.name,
        proyectoId: a.projectId,
        proyectoNombre: a.project?.proyecto ?? '',
        porcentaje: a.progress ?? 0,
      })),
    indicadoresPorEvidenciar: indicadores
      .filter(
        (i) => Number(i.porcentajeCumplimiento ?? 0) >= MIN_AVANCE_POR_EVIDENCIAR
      )
      .map((i) => ({
        id: i.id,
        nombre: i.nombre,
        proyectoId: i.proyectoId,
        proyectoNombre: i.proyecto?.proyecto ?? '',
        porcentaje: Number(i.porcentajeAvance ?? 0),
      })),
  };
}

/**
 * Alertas del portal según rol activo.
 * Coordinador / Encargado / Colaborador / Docente / Estudiante →
 * evidenciar actividades/indicadores + presupuesto + atrasadas.
 * Solo proyectos donde el usuario tiene ese rol.
 */
export async function getAlertasPortalUsuario(activeRole: string | null) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: null };
    }

    const proyectoIds = await getProyectoIdsPorRol(user, activeRole);
    if (proyectoIds.length === 0) {
      return { success: true, data: emptyAlertasPortal() };
    }

    const rolPermitido =
      activeRole != null &&
      (ROLES_ALERTAS_PORTAL as readonly string[]).includes(activeRole);

    if (!rolPermitido) {
      return { success: true, data: emptyAlertasPortal() };
    }

    const [porEvidenciar, presupuesto, atrasadas] = await Promise.all([
      fetchAlertasPorEvidenciar(proyectoIds),
      fetchPresupuestoPorSolicitar(proyectoIds),
      fetchActividadesAtrasadas(proyectoIds),
    ]);

    return {
      success: true,
      data: {
        actividadesPorEvidenciar: porEvidenciar.actividadesPorEvidenciar,
        indicadoresPorEvidenciar: porEvidenciar.indicadoresPorEvidenciar,
        presupuestoPorSolicitar: presupuesto,
        actividadesAtrasadas: atrasadas,
      },
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
 * Carga inicial del portal de inicio en el servidor (SSR).
 */
export async function getInicioInitialData(
  activeRole: string | null
): Promise<InicioInitialData | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const role =
    activeRole ??
    (user as { availableRoles?: string[] }).availableRoles?.[0] ??
    null;

  const [proyectosRes, alertasRes, compromisosRes, historialRes] =
    await Promise.all([
      getProyectosDelUsuarioConRol(role),
      getAlertasPortalUsuario(role),
      getCompromisosPendientesParaUsuario(role),
      getHistorialRecienteParaUsuario(role, 10),
    ]);

  return {
    role,
    proyectos: proyectosRes.success ? proyectosRes.data ?? [] : [],
    alertas: alertasRes.success ? alertasRes.data : null,
    compromisos: compromisosRes.success ? compromisosRes.data ?? [] : [],
    historial: historialRes.success ? historialRes.data ?? [] : [],
  };
}
