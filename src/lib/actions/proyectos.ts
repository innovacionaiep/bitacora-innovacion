'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { createHistorialEntry, createHistorialEntriesBatch } from './historial';
import { getCurrentUser } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import {
  requireAdmin,
  requirePermission,
  requireProjectAccess,
  requireProjectCoordinatorOrAdmin,
} from '@/lib/authz/guards';
import { catalogCreateRequiresAjustes } from '@/lib/authz/catalog-create-policy';
import {
  Escuela,
  Carrera,
  Asignatura,
  Comuna,
  GrupoInteres,
  SocioComunitario,
} from '@prisma/client';
import {
  ProyectoFormData,
  ProyectoFormPayload,
  ProyectoWithRelations,
  CatalogoResponse,
  type ProyectoConVariaciones,
  type ProyectoData,
  type ProyectoListadoItem,
} from '@/types/proyecto';
import { createActivity, createTask } from '@/lib/actions/gantt';
import { createIndicador } from '@/lib/actions/indicadores';
import { createItemPresupuesto } from '@/lib/actions/presupuesto';
import { getMesAnteriorInfo } from '@/lib/utils/fecha';
import { computeAvancePresupuestoPct } from '@/lib/utils/presupuesto-calculos';
import {
  isSyncableRole,
  upsertPersonaFromParticipante,
} from '@/lib/personas/sync-persona';

type GeneralTabUpdateData = {
  proyectoId: string;
  proyecto?: string;
  fondo?: string;
  linea?: string | null;
  sede?: string;
  youtubeUrl?: string | null;
  objetivoGeneral?: {
    id?: string;
    descripcion: string;
  };
  objetivosEspecificos?: Array<{
    id: string;
    descripcion: string;
    orden: number;
  }>;
  escuelasIds?: string[];
  carrerasIds?: string[];
  asignaturasIds?: string[];
  comunasIds?: string[];
  gruposInteresIds?: string[];
  sociosComunitariosIds?: string[];
  desarrolloTecnico?: {
    continuidadFasesAnteriores?: string | null;
    pertinenciaLocal?: string | null;
    pertinenciaDisciplinar?: string | null;
    necesidadProblema?: string | null;
    publicoObjetivo?: string | null;
    solucionAvance?: string | null;
    perspectiveGenero?: string | null;
    resultadosContribucion?: string | null;
    metodologiaMedicion?: string | null;
    ejesImpacto?: string | null;
    factorInnovador?: string | null;
    escalabilidad?: string | null;
  };
  /** Elementos DT nuevos (sin columna legacy), por subcategoría de config */
  desarrolloTecnicoValores?: Array<{
    subcategoriaId: string;
    valor: string;
  }>;
};

/**
 * Función interna para obtener proyectos de la BD (sin caché).
 * Si whereIds está definido, solo devuelve esos proyectos.
 *
 * @deprecated No usar para listados ni selectores de UI — usar
 * `getProyectosListadoParaUsuario` en su lugar. Esta consulta carga el grafo
 * completo (activities, participantes, desarrollo técnico, etc.) y es costosa.
 */
async function _getProyectosFromDB(whereIds?: string[]) {
  // Obtener información del mes anterior para calcular variaciones
  const { mesAnterior, anioMesAnterior } = getMesAnteriorInfo();

  // NOTA: Incluimos activities con tasks completas para compatibilidad de tipos
  const proyectos = await prisma.proyecto.findMany({
    ...(whereIds && whereIds.length > 0 && { where: { id: { in: whereIds } } }),
    include: {
      activities: {
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
      participantes_rel: {
        include: {
          user: true,
          socioComunitario: true,
          sede: true,
          escuela: true,
          carrera: true,
          asignatura: true,
        },
      },
      escuelas: {
        include: {
          escuela: true,
        },
      },
      carreras: {
        include: {
          carrera: true,
        },
      },
      asignaturas: {
        include: {
          asignatura: true,
        },
      },
      comunas: {
        include: {
          comuna: true,
        },
      },
      gruposInteres: {
        include: {
          grupoInteres: true,
        },
      },
      sociosComunitarios: {
        include: {
          socioComunitario: true,
        },
      },
      objetivos_rel: {
        orderBy: {
          orden: 'asc',
        },
      },
      desarrolloTecnico: true,
      desarrolloTecnicoValores: {
        include: { subcategoria: true },
      },
      snapshotsMensuales: {
        where: {
          mes: mesAnterior,
          anio: anioMesAnterior,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calcular variaciones para cada proyecto
  const proyectosConVariaciones: ProyectoConVariaciones[] = proyectos.map(
    (proyecto) => {
      const snapshotMesAnterior = proyecto.snapshotsMensuales[0];

      // Si hay snapshot del mes anterior, calcular la diferencia
      // Si no hay snapshot, la variación es 0 (sin datos de comparación)
      const variacionGantt = snapshotMesAnterior
        ? proyecto.avanceGantt - snapshotMesAnterior.avanceGantt
        : 0;

      const variacionObjetivos = snapshotMesAnterior
        ? proyecto.objetivos - snapshotMesAnterior.objetivos
        : 0;

      // Remover snapshotsMensuales del objeto final (no necesario en frontend)
      const { snapshotsMensuales, ...proyectoSinSnapshots } = proyecto;

      return {
        ...proyectoSinSnapshots,
        variacionGantt,
        variacionObjetivos,
        avancePresupuesto: 0,
      } as ProyectoConVariaciones;
    }
  );

  return proyectosConVariaciones;
}

/**
 * Consulta optimizada para dashboard: incluye activities/tasks y relaciones
 * necesarias para gráficos, sin desarrollo técnico ni datos irrelevantes.
 */
async function _getProyectosDashboardFromDB(whereIds?: string[]) {
  const { mesAnterior, anioMesAnterior } = getMesAnteriorInfo();

  const proyectos = await prisma.proyecto.findMany({
    ...(whereIds && whereIds.length > 0 && { where: { id: { in: whereIds } } }),
    include: {
      activities: {
        include: {
          tasks: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              progress: true,
              completed: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
      participantes_rel: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          socioComunitario: {
            select: { id: true, nombre: true, descripcion: true },
          },
          sede: { select: { id: true, nombre: true } },
          escuela: { select: { id: true, nombre: true } },
          carrera: { select: { id: true, nombre: true } },
          asignatura: { select: { id: true, nombre: true } },
        },
      },
      escuelas: { include: { escuela: true } },
      carreras: { include: { carrera: true } },
      asignaturas: { include: { asignatura: true } },
      comunas: { include: { comuna: true } },
      gruposInteres: { include: { grupoInteres: true } },
      sociosComunitarios: {
        include: {
          socioComunitario: {
            select: { id: true, nombre: true, descripcion: true },
          },
        },
      },
      snapshotsMensuales: {
        where: { mes: mesAnterior, anio: anioMesAnterior },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const proyectoIds = proyectos.map((p) => p.id);
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
    Array<(typeof itemsPresupuesto)[number]>
  >();
  for (const item of itemsPresupuesto) {
    const list = itemsByProyecto.get(item.proyectoId) ?? [];
    list.push(item);
    itemsByProyecto.set(item.proyectoId, list);
  }

  return proyectos.map((proyecto) => {
    const snapshotMesAnterior = proyecto.snapshotsMensuales[0];
    const variacionGantt = snapshotMesAnterior
      ? proyecto.avanceGantt - snapshotMesAnterior.avanceGantt
      : 0;
    const variacionObjetivos = snapshotMesAnterior
      ? proyecto.objetivos - snapshotMesAnterior.objetivos
      : 0;
    const avancePresupuesto = computeAvancePresupuestoPct(
      itemsByProyecto.get(proyecto.id) ?? [],
      proyecto.presupuestoAdjudicado ?? 0
    );
    const { snapshotsMensuales, ...proyectoSinSnapshots } = proyecto;
    return {
      ...proyectoSinSnapshots,
      variacionGantt,
      variacionObjetivos,
      avancePresupuesto,
    } as ProyectoConVariaciones;
  });
}

async function getProyectoIdsForUserParticipation(
  userId: string,
  userEmail: string | null | undefined
): Promise<string[]> {
  const participaciones = await prisma.proyectoParticipante.findMany({
    where: {
      OR: [
        { userId },
        ...(userEmail
          ? [{ email: { equals: userEmail, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    select: { proyectoId: true },
  });
  return [...new Set(participaciones.map((p) => p.proyectoId))];
}

/**
 * Obtener todos los proyectos visibles para el usuario (sesión).
 * Admin / projects.view_all: todos. Otros: todas las participaciones del usuario.
 * Sin caché global compartida entre usuarios.
 */
export async function getProyectos() {
  return getProyectosListadoParaUsuario();
}

/**
 * Proyectos optimizados para el dashboard (sin grafo completo innecesario).
 * Filtrado por sesión; caché keyed por userId + view_all.
 */
export async function getProyectosDashboard() {
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

    const cacheKey = [
      'proyectos-dashboard-list',
      user.id,
      canViewAll ? 'all' : 'scoped',
    ];

    const load = async () => {
      if (canViewAll) {
        return _getProyectosDashboardFromDB();
      }
      const userEmail = user.email ?? null;
      const proyectoIds = await getProyectoIdsForUserParticipation(
        user.id,
        userEmail
      );
      if (proyectoIds.length === 0) return [];
      return _getProyectosDashboardFromDB(proyectoIds);
    };

    const cached = unstable_cache(load, cacheKey, {
      revalidate: 45,
      tags: ['proyectos-dashboard', `proyectos-dashboard-${user.id}`],
    });

    const proyectosConVariaciones = await cached();
    return { success: true, data: proyectosConVariaciones };
  } catch (error) {
    console.error('❌ [getProyectosDashboard] Error:', error);
    return { success: false, error: 'Error al obtener proyectos' };
  }
}

/**
 * Obtener proyectos visibles para el usuario.
 * - projects.view_all (Admin por defecto): ven todos los proyectos.
 * - Otros: todos los proyectos donde participan (cualquier rol).
 */
export async function getProyectosParaUsuarioPorRolActivo(
  activeRoleOverride?: string | null
) {
  return getProyectosListadoParaUsuario(activeRoleOverride);
}

/**
 * Listado ligero de proyectos para el selector (solo id, nombre, sede, escuelas).
 * Carga instantánea; los detalles completos se cargan al seleccionar.
 */
export async function getProyectosListadoParaUsuario(
  _activeRoleOverride?: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const availableRoles = user.availableRoles ?? [];
    if (await userHasPermission(availableRoles, 'projects.view_all')) {
      const proyectos = await prisma.proyecto.findMany({
        select: {
          id: true,
          proyecto: true,
          sede: true,
          fondo: true,
          escuelas: { include: { escuela: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: proyectos as ProyectoListadoItem[] };
    }

    const userEmail = user.email ?? null;
    const proyectoIds = await getProyectoIdsForUserParticipation(
      user.id,
      userEmail
    );

    if (proyectoIds.length === 0) {
      return { success: true, data: [] };
    }

    const proyectos = await prisma.proyecto.findMany({
      where: { id: { in: proyectoIds } },
      select: {
        id: true,
        proyecto: true,
        sede: true,
        fondo: true,
        escuelas: { include: { escuela: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: proyectos as ProyectoListadoItem[] };
  } catch (error) {
    console.error('❌ [getProyectosListadoParaUsuario] Error:', error);
    return { success: false, error: 'Error al obtener listado', data: [] };
  }
}

type GetProyectoOptions = {
  /** Si true, incluye activities/tasks. Default false (carga rápida al seleccionar). */
  includeActivities?: boolean;
  /**
   * Si true, incluye participantes_rel enriquecidos.
   * Default false: el tab Participantes los carga vía getProyectoParticipantes.
   */
  includeParticipantes?: boolean;
  /**
   * Si true, incluye desarrolloTecnico y desarrolloTecnicoValores.
   * Default false: el cliente los carga vía getProyectoDesarrolloTecnico.
   */
  includeDesarrolloTecnico?: boolean;
};

type ParticipanteRelRow = NonNullable<
  ProyectoWithRelations['participantes_rel']
>[number];

async function enrichParticipantesRel(
  participantes: Array<{
    userId?: string | null;
    email?: string | null;
    nombre?: string | null;
    user?: { name?: string | null; image?: string | null } | null;
    [key: string]: unknown;
  }>
): Promise<ParticipanteRelRow[]> {
  const emailsSinUser = [
    ...new Set(
      participantes
        .filter((p) => !p.userId && p.email?.trim())
        .map((p) => p.email!.trim())
    ),
  ];
  const userByEmailLower = new Map<
    string,
    { name: string | null; image: string | null }
  >();
  if (emailsSinUser.length > 0) {
    // Exact match first (usa índice de email); insensitive solo para residuales.
    const usersExact = await prisma.user.findMany({
      where: { email: { in: emailsSinUser } },
      select: { email: true, name: true, image: true },
    });
    usersExact.forEach((u) => {
      if (u.email)
        userByEmailLower.set(u.email.toLowerCase(), {
          name: u.name ?? null,
          image: u.image ?? null,
        });
    });
    const missing = emailsSinUser.filter(
      (e) => !userByEmailLower.has(e.toLowerCase())
    );
    if (missing.length > 0) {
      const usersInsensitive = await prisma.user.findMany({
        where: {
          OR: missing.map((e) => ({
            email: { equals: e, mode: 'insensitive' as const },
          })),
        },
        select: { email: true, name: true, image: true },
      });
      usersInsensitive.forEach((u) => {
        if (u.email)
          userByEmailLower.set(u.email.toLowerCase(), {
            name: u.name ?? null,
            image: u.image ?? null,
          });
      });
    }
  }
  return participantes.map((p) => {
    const display =
      !p.user && p.email?.trim()
        ? userByEmailLower.get(p.email.trim().toLowerCase())
        : undefined;
    return {
      ...p,
      displayName: p.user?.name ?? display?.name ?? p.nombre ?? 'Sin nombre',
      displayImage: p.user?.image ?? display?.image ?? null,
    };
  }) as ParticipanteRelRow[];
}

const participantesInclude = {
  user: {
    select: { id: true, name: true, email: true, image: true },
  },
  socioComunitario: {
    select: { id: true, nombre: true, descripcion: true },
  },
  sede: { select: { id: true, nombre: true } },
  escuela: { select: { id: true, nombre: true } },
  carrera: { select: { id: true, nombre: true } },
  asignatura: { select: { id: true, nombre: true } },
} as const;

/**
 * Obtener un proyecto por ID con relaciones del detalle base (selects estrechos).
 * Activities van aparte vía getActivities salvo includeActivities: true.
 * Participantes van aparte vía getProyectoParticipantes salvo includeParticipantes: true.
 */
export async function getProyecto(
  id: string,
  options: GetProyectoOptions = {}
) {
  const {
    includeActivities = false,
    includeParticipantes = false,
    includeDesarrolloTecnico = false,
  } = options;
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        ...(includeActivities
          ? {
              activities: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  progress: true,
                  projectId: true,
                  color: true,
                  orderIndex: true,
                  kanbanOrderIndex: true,
                  status: true,
                  createdAt: true,
                  updatedAt: true,
                  tasks: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      completed: true,
                      startDate: true,
                      endDate: true,
                      progress: true,
                      activityId: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                    orderBy: { createdAt: 'asc' },
                  },
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
            }
          : {}),
        ...(includeParticipantes
          ? {
              participantes_rel: {
                include: participantesInclude,
              },
            }
          : {}),
        // Conteo real para el meta-row del header (sin hidratar la lista completa).
        _count: { select: { participantes_rel: true } },
        escuelas: {
          include: {
            escuela: { select: { id: true, nombre: true, codigo: true } },
          },
        },
        carreras: {
          include: {
            carrera: { select: { id: true, nombre: true } },
          },
        },
        asignaturas: {
          include: {
            asignatura: { select: { id: true, nombre: true } },
          },
        },
        comunas: {
          include: {
            comuna: { select: { id: true, nombre: true, region: true } },
          },
        },
        gruposInteres: {
          include: {
            grupoInteres: {
              select: { id: true, nombre: true, descripcion: true },
            },
          },
        },
        sociosComunitarios: {
          include: {
            socioComunitario: {
              select: { id: true, nombre: true, descripcion: true },
            },
          },
        },
        objetivos_rel: {
          orderBy: {
            orden: 'asc',
          },
        },
        ...(includeDesarrolloTecnico
          ? {
              desarrolloTecnico: true,
              desarrolloTecnicoValores: {
                include: {
                  subcategoria: {
                    select: {
                      id: true,
                      nombre: true,
                      categoriaId: true,
                      orden: true,
                      icono: true,
                      campoKey: true,
                    },
                  },
                },
              },
            }
          : {}),
      },
    });

    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const { _count, ...proyectoSinCount } = proyecto;
    const participantesCount = _count.participantes_rel;

    if (!includeParticipantes) {
      return {
        success: true,
        data: {
          ...proyectoSinCount,
          // El Int denormalizado suele quedar desfasado; usar conteo real de la relación.
          participantes: participantesCount,
          participantes_rel: undefined,
        } as ProyectoWithRelations,
      };
    }

    const withParticipantes = proyecto as typeof proyecto & {
      participantes_rel: Parameters<typeof enrichParticipantesRel>[0];
    };
    const participantesEnriquecidos = await enrichParticipantesRel(
      withParticipantes.participantes_rel
    );

    return {
      success: true,
      data: {
        ...proyectoSinCount,
        participantes: participantesEnriquecidos.length,
        participantes_rel: participantesEnriquecidos,
      } as ProyectoWithRelations,
    };
  } catch (error) {
    console.error('Error getting proyecto:', error);
    return { success: false, error: 'Error al obtener proyecto' };
  }
}

/**
 * Detalle base para seleccionar proyecto (General / header / Convenio).
 * Sin activities ni participantes.
 */
export async function getProyectoBase(id: string) {
  return getProyecto(id, {
    includeActivities: false,
    includeParticipantes: false,
  });
}

/**
 * Solo desarrollo técnico del proyecto (carga diferida tras getProyectoBase).
 */
export async function getProyectoDesarrolloTecnico(proyectoId: string) {
  try {
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) {
      return { success: false as const, error: gate.error };
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        desarrolloTecnico: true,
        desarrolloTecnicoValores: {
          include: {
            subcategoria: {
              select: {
                id: true,
                nombre: true,
                categoriaId: true,
                orden: true,
                icono: true,
                campoKey: true,
              },
            },
          },
        },
      },
    });

    if (!proyecto) {
      return { success: false as const, error: 'Proyecto no encontrado' };
    }

    return {
      success: true as const,
      data: {
        desarrolloTecnico: proyecto.desarrolloTecnico,
        desarrolloTecnicoValores: proyecto.desarrolloTecnicoValores,
      },
    };
  } catch (error) {
    console.error('Error getting proyecto desarrollo técnico:', error);
    return {
      success: false as const,
      error: 'Error al obtener desarrollo técnico',
    };
  }
}

/**
 * Solo participantes del proyecto (tab Participantes / Seguimiento rol).
 */
export async function getProyectoParticipantes(proyectoId: string) {
  try {
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) {
      return {
        success: false as const,
        error: gate.error,
        data: [] as ParticipanteRelRow[],
      };
    }

    const rows = await prisma.proyectoParticipante.findMany({
      where: { proyectoId },
      include: participantesInclude,
    });
    const participantes_rel = await enrichParticipantesRel(rows);
    return { success: true as const, data: participantes_rel };
  } catch (error) {
    console.error('Error getting proyecto participantes:', error);
    return {
      success: false as const,
      error: 'Error al obtener participantes',
      data: [] as ParticipanteRelRow[],
    };
  }
}

type CreateProyectoInput = ProyectoFormData & {
  youtubeUrl?: string | null;
};

/**
 * Crear un nuevo proyecto con todas las relaciones
 */
export async function createProyecto(data: CreateProyectoInput) {
  try {
    const gate = await requirePermission('projects.create');
    if (!gate.ok) return { success: false, error: gate.error };

    const sedeStr =
      data.sede?.trim()
        ? data.sede.trim()
        : data.sedesIds && data.sedesIds.length > 0
          ? data.sedesIds.join(', ')
          : '';
    const proyecto = await prisma.proyecto.create({
      data: {
        proyecto: data.proyecto,
        fondo: data.fondo ?? '',
        linea: data.linea?.trim() || null,
        sede: sedeStr,
        youtubeUrl: data.youtubeUrl ?? null,
        focalizacion: data.focalizacion,
        avanceGantt: data.avanceGantt || 0,
        objetivos: data.objetivos || 0,
        presupuestoUsado: data.presupuestoUsado || 0,
        presupuestoTotal: data.presupuestoTotal,
        participantes: data.participantes,

        // Crear relaciones
        escuelas: {
          create: data.escuelasIds.map((escuelaId) => ({
            escuelaId,
          })),
        },
        carreras: {
          create: data.carrerasIds.map((carreraId) => ({
            carreraId,
          })),
        },
        asignaturas: {
          create: (data.asignaturasIds ?? []).map((asignaturaId) => ({
            asignaturaId,
          })),
        },
        comunas: {
          create: data.comunasIds.map((comunaId) => ({
            comunaId,
          })),
        },
        gruposInteres: {
          create: data.gruposInteresIds.map((grupoId) => ({
            grupoInteresId: grupoId,
          })),
        },
        sociosComunitarios: {
          create: data.sociosComunitariosIds.map((socioId) => ({
            socioComunitarioId: socioId,
          })),
        },
        participantes_rel: {
          create: data.participantes_rel.map((participante) => ({
            userId: participante.userId ?? null,
            rol: participante.rol,
            nombre: participante.nombre ?? null,
            email: participante.email ?? null,
          })),
        },
        objetivos_rel: {
          create: [
            {
              tipo: 'General',
              descripcion: data.objetivoGeneral,
              orden: 0,
            },
            ...data.objetivosEspecificos.map((objetivo, index) => ({
              tipo: 'Especifico' as const,
              descripcion: objetivo,
              orden: index + 1,
            })),
          ],
        },
      },
      include: {
        participantes_rel: {
          include: {
            user: true,
            socioComunitario: true,
          },
        },
        escuelas: {
          include: {
            escuela: true,
          },
        },
        carreras: {
          include: {
            carrera: true,
          },
        },
        asignaturas: {
          include: {
            asignatura: true,
          },
        },
        comunas: {
          include: {
            comuna: true,
          },
        },
        gruposInteres: {
          include: {
            grupoInteres: true,
          },
        },
        sociosComunitarios: {
          include: {
            socioComunitario: true,
          },
        },
        objetivos_rel: {
          orderBy: {
            orden: 'asc',
          },
        },
      },
    });

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error creating proyecto:', error);
    return { success: false, error: 'Error al crear proyecto' };
  }
}

/**
 * Crear proyecto completo desde el formulario (incluye DT, actividades/tareas, indicadores, presupuesto)
 */
export async function createProyectoCompleto(
  payload: ProyectoFormPayload
): Promise<{ success: boolean; data?: ProyectoWithRelations; error?: string }> {
  try {
    const gate = await requirePermission('projects.create');
    if (!gate.ok) return { success: false, error: gate.error };
    const currentUser = gate.user;

    // Centralizar personas syncables (User pendiente + UserRole) y resolver userId
    const participantesRel = [...(payload.participantes_rel ?? [])];
    for (let i = 0; i < participantesRel.length; i++) {
      const p = participantesRel[i];
      const email = p.email?.trim();
      if (!email) continue;
      if (isSyncableRole(p.rol)) {
        const persona = await upsertPersonaFromParticipante({
          email,
          nombre: p.nombre,
          rut: p.rut,
          cargo: p.cargo,
          sedeId: p.sedeId,
          escuelaId: p.escuelaId,
          rol: p.rol,
        });
        participantesRel[i] = {
          ...p,
          userId: persona.userId,
          nombre: (p.nombre?.trim() || persona.name) ?? undefined,
          email: persona.email,
        };
      } else {
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (user) {
          participantesRel[i] = {
            ...p,
            userId: user.id,
            nombre: (p.nombre?.trim() || user.name) ?? undefined,
            email: user.email,
          };
        }
      }
    }

    // Rol de participación elegido en el formulario (único por cuenta/proyecto)
    const creatorRoles = currentUser?.availableRoles ?? [];
    const miRol = payload.miRolEnProyecto;
    if (!miRol) {
      return {
        success: false,
        error: 'Debes elegir tu rol en este proyecto',
      };
    }
    if (!creatorRoles.includes(miRol) && !creatorRoles.includes('Admin')) {
      return {
        success: false,
        error: 'El rol elegido no está habilitado en tu cuenta',
      };
    }
    if (currentUser?.id) {
      const emailNorm = (currentUser.email ?? '').trim().toLowerCase();
      const yaEsta = participantesRel.some(
        (p) =>
          p.userId === currentUser.id ||
          (p.email?.trim() && p.email.trim().toLowerCase() === emailNorm)
      );
      if (!yaEsta) {
        participantesRel.unshift({
          userId: currentUser.id,
          rol: miRol,
          nombre: (currentUser.name as string) ?? undefined,
          email: (currentUser.email as string) ?? undefined,
        });
      } else {
        const idx = participantesRel.findIndex(
          (p) =>
            p.userId === currentUser.id ||
            (p.email?.trim() && p.email.trim().toLowerCase() === emailNorm)
        );
        if (idx >= 0) {
          participantesRel[idx] = {
            ...participantesRel[idx],
            rol: miRol,
            userId: currentUser.id,
          };
          for (let i = participantesRel.length - 1; i >= 0; i--) {
            if (i === idx) continue;
            const p = participantesRel[i];
            if (
              p.userId === currentUser.id ||
              (p.email?.trim() && p.email.trim().toLowerCase() === emailNorm)
            ) {
              participantesRel.splice(i, 1);
            }
          }
        }
      }
    }

    const sedeStr =
      payload.sede?.trim()
        ? payload.sede.trim()
        : payload.sedesIds && payload.sedesIds.length > 0
          ? payload.sedesIds.join(', ')
          : '';
    const base: CreateProyectoInput = {
      proyecto: payload.proyecto,
      fondo: payload.fondo ?? '',
      linea: payload.linea?.trim() || null,
      sede: sedeStr,
      ...(payload.sedesIds && { sedesIds: payload.sedesIds }),
      youtubeUrl: payload.youtubeUrl ?? null,
      focalizacion: payload.focalizacion ?? null,
      objetivoGeneral: payload.objetivoGeneral,
      objetivosEspecificos: payload.objetivosEspecificos ?? [],
      avanceGantt: payload.avanceGantt ?? 0,
      objetivos: payload.objetivos ?? 0,
      presupuestoUsado: payload.presupuestoUsado ?? 0,
      presupuestoTotal: payload.presupuestoTotal ?? 0,
      participantes: payload.participantes ?? 0,
      escuelasIds: payload.escuelasIds ?? [],
      carrerasIds: payload.carrerasIds ?? [],
      asignaturasIds: payload.asignaturasIds ?? [],
      comunasIds: payload.comunasIds ?? [],
      gruposInteresIds: payload.gruposInteresIds ?? [],
      sociosComunitariosIds: payload.sociosComunitariosIds ?? [],
      participantes_rel: participantesRel,
    };
    const result = await createProyecto(base);
    if (!result.success || !result.data) {
      return { success: false, error: result.error ?? 'Error al crear proyecto' };
    }
    const proyecto = result.data as ProyectoWithRelations & { objetivos_rel: { id: string; tipo: string; orden: number }[] };
    const proyectoId = proyecto.id;

    if (payload.desarrolloTecnico && Object.keys(payload.desarrolloTecnico).length > 0) {
      await updateProyectoGeneralTab({
        proyectoId,
        desarrolloTecnico: payload.desarrolloTecnico,
      });
    }

    if (payload.actividades && payload.actividades.length > 0) {
      for (let i = 0; i < payload.actividades.length; i++) {
        const act = payload.actividades[i];
        const actResult = await createActivity({
          projectId: proyectoId,
          name: act.name,
          description: act.description ?? '',
          color: act.color ?? 'bg-gray-700',
          orderIndex: act.orderIndex ?? i,
          progress: 0,
          kanbanOrderIndex: act.orderIndex ?? i,
          status: 'TODO',
        });
        if (!actResult.success || !actResult.data) continue;
        const activityId = actResult.data.id;
        if (act.tasks && act.tasks.length > 0) {
          for (const t of act.tasks) {
            await createTask({
              activityId,
              name: t.name,
              description: t.description ?? '',
              startDate: t.startDate,
              endDate: t.endDate,
              progress: 0,
              completed: false,
            });
          }
        }
      }
    }

    const objetivosRel = proyecto.objetivos_rel ?? [];
    const objetivosEspecificosIds = objetivosRel
      .filter((o) => o.tipo === 'Especifico')
      .sort((a, b) => a.orden - b.orden)
      .map((o) => o.id);

    if (payload.indicadores && payload.indicadores.length > 0 && objetivosEspecificosIds.length > 0) {
      for (const ind of payload.indicadores) {
        const objId = objetivosEspecificosIds[ind.objetivoEspecificoIndex];
        if (!objId) continue;
        await createIndicador(proyectoId, objId, {
          nombre: ind.nombre,
          descripcion: ind.descripcion,
          formaCalculo: ind.formaCalculo,
          resultadoEsperado: ind.resultadoEsperado,
          formatoNumero: ind.formatoNumero ?? null,
          fechaInicio: ind.fechaInicio ?? null,
          fechaFin: ind.fechaFin ?? null,
        });
      }
    }

    if (payload.itemsPresupuesto && payload.itemsPresupuesto.length > 0) {
      for (let i = 0; i < payload.itemsPresupuesto.length; i++) {
        const item = payload.itemsPresupuesto[i];
        await createItemPresupuesto(proyectoId, {
          cuenta: item.cuenta,
          item: item.item,
          detalle: item.detalle ?? null,
          monto: item.monto,
          orden: item.orden ?? i,
        });
      }
    }

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    const full = await getProyecto(proyectoId, { includeParticipantes: true });
    return full.success && full.data
      ? { success: true, data: full.data as ProyectoWithRelations }
      : { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error createProyectoCompleto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear proyecto completo',
    };
  }
}

/**
 * Actualizar un proyecto
 */
export async function updateProyecto(id: string, data: Partial<ProyectoData>) {
  try {
    const gate = await requireProjectAccess(id, 'projects.edit');
    if (!gate.ok) return { success: false, error: gate.error };

    if (data.presupuestoAdjudicado !== undefined) {
      const adjudicadoGate = await requireProjectCoordinatorOrAdmin(id);
      if (!adjudicadoGate.ok) {
        return { success: false, error: adjudicadoGate.error };
      }
    }

    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
        ...(data.fondo !== undefined && { fondo: data.fondo }),
        ...(data.linea !== undefined && { linea: data.linea }),
        ...(data.sede !== undefined && { sede: data.sede }),
        ...(data.focalizacion !== undefined && {
          focalizacion: data.focalizacion,
        }),
        ...(data.avanceGantt !== undefined && {
          avanceGantt: data.avanceGantt,
        }),
        ...(data.objetivos !== undefined && { objetivos: data.objetivos }),
        ...(data.presupuestoUsado !== undefined && {
          presupuestoUsado: data.presupuestoUsado,
        }),
        ...(data.presupuestoTotal !== undefined && {
          presupuestoTotal: data.presupuestoTotal,
        }),
        ...(data.presupuestoAdjudicado !== undefined && {
          presupuestoAdjudicado: data.presupuestoAdjudicado,
        }),
        ...(data.participantes !== undefined && {
          participantes: data.participantes,
        }),
      },
    });

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    revalidatePath(`/gantt`);
    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error updating proyecto:', error);
    return { success: false, error: 'Error al actualizar proyecto' };
  }
}

/**
 * Actualizar datos del tab General (objetivos, info básica, desarrollo técnico)
 */
function strEq(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? '').trim() === (b ?? '').trim();
}
function idsEq(a: string[] | undefined, b: string[]): boolean {
  if (!a) return b.length === 0;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}

export async function updateProyectoGeneralTab(data: GeneralTabUpdateData) {
  try {
    const gate = await requireProjectAccess(data.proyectoId, 'projects.edit');
    if (!gate.ok) return { success: false, error: gate.error };

    // Cargar estado previo para registrar en historial solo lo que realmente cambió
    const estadoAnterior = await prisma.proyecto.findUnique({
      where: { id: data.proyectoId },
      select: {
        proyecto: true,
        fondo: true,
        linea: true,
        sede: true,
        escuelas: { select: { escuelaId: true } },
        carreras: { select: { carreraId: true } },
        asignaturas: { select: { asignaturaId: true } },
        comunas: { select: { comunaId: true } },
        gruposInteres: { select: { grupoInteresId: true } },
        sociosComunitarios: { select: { socioComunitarioId: true } },
        objetivos_rel: { orderBy: { orden: 'asc' }, select: { id: true, descripcion: true, orden: true, tipo: true } },
        desarrolloTecnico: true,
        desarrolloTecnicoValores: {
          select: { subcategoriaId: true, valor: true },
        },
      },
    });

    const [row] = await prisma.$queryRaw<{ youtube_url: string | null }[]>`
      SELECT youtube_url FROM proyectos WHERE id = ${data.proyectoId}
    `.catch(() => [{ youtube_url: null }]);
    const estadoAnteriorYoutube = row?.youtube_url ?? null;

    await prisma.$transaction(async (tx) => {
      if (
        data.proyecto !== undefined ||
        data.fondo !== undefined ||
        data.linea !== undefined ||
        data.sede !== undefined
      ) {
        await tx.proyecto.update({
          where: { id: data.proyectoId },
          data: {
            ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
            ...(data.fondo !== undefined && { fondo: data.fondo }),
            ...(data.linea !== undefined && { linea: data.linea }),
            ...(data.sede !== undefined && { sede: data.sede }),
          },
        });
      }
      if (data.youtubeUrl !== undefined) {
        await tx.$executeRaw`
          UPDATE proyectos SET youtube_url = ${data.youtubeUrl || null} WHERE id = ${data.proyectoId}
        `;
      }

      if (data.escuelasIds) {
        await tx.proyectoEscuela.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.escuelasIds.length > 0) {
          await tx.proyectoEscuela.createMany({
            data: data.escuelasIds.map((escuelaId) => ({
              proyectoId: data.proyectoId,
              escuelaId,
            })),
          });
        }
      }

      if (data.carrerasIds) {
        await tx.proyectoCarrera.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.carrerasIds.length > 0) {
          await tx.proyectoCarrera.createMany({
            data: data.carrerasIds.map((carreraId) => ({
              proyectoId: data.proyectoId,
              carreraId,
            })),
          });
        }
      }

      if (data.asignaturasIds) {
        await tx.proyectoAsignatura.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.asignaturasIds.length > 0) {
          await tx.proyectoAsignatura.createMany({
            data: data.asignaturasIds.map((asignaturaId) => ({
              proyectoId: data.proyectoId,
              asignaturaId,
            })),
          });
        }
      }

      if (data.comunasIds) {
        await tx.proyectoComuna.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.comunasIds.length > 0) {
          await tx.proyectoComuna.createMany({
            data: data.comunasIds.map((comunaId) => ({
              proyectoId: data.proyectoId,
              comunaId,
            })),
          });
        }
      }

      if (data.gruposInteresIds) {
        await tx.proyectoGrupoInteres.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.gruposInteresIds.length > 0) {
          await tx.proyectoGrupoInteres.createMany({
            data: data.gruposInteresIds.map((grupoInteresId) => ({
              proyectoId: data.proyectoId,
              grupoInteresId,
            })),
          });
        }
      }

      if (data.sociosComunitariosIds) {
        await tx.proyectoSocioComunitario.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.sociosComunitariosIds.length > 0) {
          await tx.proyectoSocioComunitario.createMany({
            data: data.sociosComunitariosIds.map((socioComunitarioId) => ({
              proyectoId: data.proyectoId,
              socioComunitarioId,
            })),
          });
        }
      }

      if (data.objetivoGeneral) {
        if (data.objetivoGeneral.id) {
          await tx.objetivoProyecto.update({
            where: { id: data.objetivoGeneral.id },
            data: { descripcion: data.objetivoGeneral.descripcion },
          });
        } else if (data.objetivoGeneral.descripcion.trim()) {
          await tx.objetivoProyecto.create({
            data: {
              proyectoId: data.proyectoId,
              tipo: 'General',
              descripcion: data.objetivoGeneral.descripcion.trim(),
              orden: 0,
            },
          });
        }
      }

      if (data.objetivosEspecificos) {
        const existingEspecificoIds = (estadoAnterior?.objetivos_rel ?? [])
          .filter((o) => o.tipo === 'Especifico')
          .map((o) => o.id);
        const payloadIds = data.objetivosEspecificos.map((o) => o.id);
        const toDelete = existingEspecificoIds.filter((id) => !payloadIds.includes(id));
        for (const id of toDelete) {
          await tx.objetivoProyecto.delete({ where: { id } });
        }
        for (const objetivo of data.objetivosEspecificos) {
          if (existingEspecificoIds.includes(objetivo.id)) {
            await tx.objetivoProyecto.update({
              where: { id: objetivo.id },
              data: {
                descripcion: objetivo.descripcion,
                orden: objetivo.orden,
              },
            });
          } else {
            await tx.objetivoProyecto.create({
              data: {
                proyectoId: data.proyectoId,
                tipo: 'Especifico',
                descripcion: objetivo.descripcion,
                orden: objetivo.orden,
              },
            });
          }
        }
      }

      if (data.desarrolloTecnico) {
        await tx.desarrolloTecnico.upsert({
          where: { proyectoId: data.proyectoId },
          update: {
            continuidadFasesAnteriores:
              data.desarrolloTecnico.continuidadFasesAnteriores ?? null,
            pertinenciaLocal: data.desarrolloTecnico.pertinenciaLocal ?? null,
            pertinenciaDisciplinar:
              data.desarrolloTecnico.pertinenciaDisciplinar ?? null,
            necesidadProblema: data.desarrolloTecnico.necesidadProblema ?? null,
            publicoObjetivo: data.desarrolloTecnico.publicoObjetivo ?? null,
            solucionAvance: data.desarrolloTecnico.solucionAvance ?? null,
            perspectiveGenero: data.desarrolloTecnico.perspectiveGenero ?? null,
            resultadosContribucion:
              data.desarrolloTecnico.resultadosContribucion ?? null,
            metodologiaMedicion:
              data.desarrolloTecnico.metodologiaMedicion ?? null,
            ejesImpacto: data.desarrolloTecnico.ejesImpacto ?? null,
            factorInnovador: data.desarrolloTecnico.factorInnovador ?? null,
            escalabilidad: data.desarrolloTecnico.escalabilidad ?? null,
          },
          create: {
            proyectoId: data.proyectoId,
            continuidadFasesAnteriores:
              data.desarrolloTecnico.continuidadFasesAnteriores ?? null,
            pertinenciaLocal: data.desarrolloTecnico.pertinenciaLocal ?? null,
            pertinenciaDisciplinar:
              data.desarrolloTecnico.pertinenciaDisciplinar ?? null,
            necesidadProblema: data.desarrolloTecnico.necesidadProblema ?? null,
            publicoObjetivo: data.desarrolloTecnico.publicoObjetivo ?? null,
            solucionAvance: data.desarrolloTecnico.solucionAvance ?? null,
            perspectiveGenero: data.desarrolloTecnico.perspectiveGenero ?? null,
            resultadosContribucion:
              data.desarrolloTecnico.resultadosContribucion ?? null,
            metodologiaMedicion:
              data.desarrolloTecnico.metodologiaMedicion ?? null,
            ejesImpacto: data.desarrolloTecnico.ejesImpacto ?? null,
            factorInnovador: data.desarrolloTecnico.factorInnovador ?? null,
            escalabilidad: data.desarrolloTecnico.escalabilidad ?? null,
          },
        });
        // Sincronizar también a DesarrolloTecnicoValor (modelo flexible)
        const subcategorias = await tx.desarrolloTecnicoSubcategoria.findMany({
          where: { campoKey: { not: null } },
          select: { id: true, campoKey: true },
        });
        const dt = data.desarrolloTecnico as Record<
          string,
          string | null | undefined
        >;
        for (const sub of subcategorias) {
          const key = sub.campoKey as string;
          const valor = dt[key];
          if (valor != null && String(valor).trim() !== '') {
            await tx.desarrolloTecnicoValor.upsert({
              where: {
                proyectoId_subcategoriaId: {
                  proyectoId: data.proyectoId,
                  subcategoriaId: sub.id,
                },
              },
              create: {
                proyectoId: data.proyectoId,
                subcategoriaId: sub.id,
                valor: String(valor),
              },
              update: { valor: String(valor) },
            });
          }
        }
      }

      if (data.desarrolloTecnicoValores !== undefined) {
        for (const item of data.desarrolloTecnicoValores) {
          const valor = item.valor?.trim() ?? '';
          await tx.desarrolloTecnicoValor.upsert({
            where: {
              proyectoId_subcategoriaId: {
                proyectoId: data.proyectoId,
                subcategoriaId: item.subcategoriaId,
              },
            },
            create: {
              proyectoId: data.proyectoId,
              subcategoriaId: item.subcategoriaId,
              valor,
            },
            update: { valor },
          });
        }
      }
    });

    const includeDesarrolloTecnico =
      data.desarrolloTecnico !== undefined ||
      data.desarrolloTecnicoValores !== undefined;
    const proyectoResult = await getProyecto(data.proyectoId, {
      includeDesarrolloTecnico,
    });
    if (!proyectoResult.success || !proyectoResult.data) {
      return {
        success: false,
        error: proyectoResult.error ?? 'Proyecto no encontrado tras actualizar',
      };
    }
    const proyectoActualizado = proyectoResult.data;

    // Registrar en historial solo los campos que realmente cambiaron (comparar con estado anterior)
    const historialEntries: Array<{
      elementoEspecifico: string;
      cambioGenerado: string;
    }> = [];

    const prev = estadoAnterior;
    const prevEscuelas = prev?.escuelas.map((e) => e.escuelaId) ?? [];
    const prevCarreras = prev?.carreras.map((c) => c.carreraId) ?? [];
    const prevAsignaturas = prev?.asignaturas.map((a) => a.asignaturaId) ?? [];
    const prevComunas = prev?.comunas.map((c) => c.comunaId) ?? [];
    const prevGrupos = prev?.gruposInteres.map((g) => g.grupoInteresId) ?? [];
    const prevSocios = prev?.sociosComunitarios.map((s) => s.socioComunitarioId) ?? [];
    const prevObjetivos = prev?.objetivos_rel ?? [];
    const prevDt = prev?.desarrolloTecnico;

    if (data.proyecto !== undefined && !strEq(data.proyecto, prev?.proyecto ?? null)) {
      historialEntries.push({
        elementoEspecifico: 'el nombre del proyecto',
        cambioGenerado: data.proyecto,
      });
    }
    if (data.fondo !== undefined && !strEq(data.fondo, prev?.fondo ?? null)) {
      historialEntries.push({
        elementoEspecifico: 'el fondo del proyecto',
        cambioGenerado: data.fondo || 'Sin fondo',
      });
    }
    if (data.sede !== undefined && !strEq(data.sede, prev?.sede ?? null)) {
      historialEntries.push({
        elementoEspecifico: 'las sedes del proyecto',
        cambioGenerado: data.sede,
      });
    }
    if (
      data.youtubeUrl !== undefined &&
      !strEq(data.youtubeUrl ?? null, estadoAnteriorYoutube)
    ) {
      historialEntries.push({
        elementoEspecifico: 'el vídeo del proyecto',
        cambioGenerado: data.youtubeUrl?.trim() ? data.youtubeUrl : 'Link del vídeo',
      });
    }
    if (
      data.objetivoGeneral !== undefined &&
      data.objetivoGeneral.descripcion.trim() &&
      !strEq(
        data.objetivoGeneral.descripcion,
        prevObjetivos.find((o) => o.tipo === 'General')?.descripcion ?? null
      )
    ) {
      historialEntries.push({
        elementoEspecifico: 'el Objetivo General del proyecto',
        cambioGenerado: data.objetivoGeneral.descripcion,
      });
    }
    if (data.objetivosEspecificos !== undefined) {
      const especificos = prevObjetivos.filter((o) => o.tipo === 'Especifico');
      data.objetivosEspecificos.forEach((obj, index) => {
        const prevDesc = especificos[index]?.descripcion ?? null;
        if (!strEq(obj.descripcion, prevDesc)) {
          historialEntries.push({
            elementoEspecifico: `el Objetivo Específico ${index + 1} del proyecto`,
            cambioGenerado: obj.descripcion,
          });
        }
      });
    }
    if (data.escuelasIds !== undefined && !idsEq(data.escuelasIds, prevEscuelas)) {
      const nombres = proyectoActualizado.escuelas
        .map((e) => e.escuela?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'las escuelas del proyecto',
        cambioGenerado: nombres.length > 0 ? nombres.join(', ') : 'Sin escuelas',
      });
    }
    if (data.carrerasIds !== undefined && !idsEq(data.carrerasIds, prevCarreras)) {
      const nombres = proyectoActualizado.carreras
        .map((c) => c.carrera?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'las carreras del proyecto',
        cambioGenerado: nombres.length > 0 ? nombres.join(', ') : 'Sin carreras',
      });
    }
    if (
      data.asignaturasIds !== undefined &&
      !idsEq(data.asignaturasIds, prevAsignaturas)
    ) {
      const nombres = proyectoActualizado.asignaturas
        .map((a) => a.asignatura?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'las asignaturas del proyecto',
        cambioGenerado:
          nombres.length > 0 ? nombres.join(', ') : 'Sin asignaturas',
      });
    }
    if (data.comunasIds !== undefined && !idsEq(data.comunasIds, prevComunas)) {
      const nombres = proyectoActualizado.comunas
        .map((c) => c.comuna?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'las comunas del proyecto',
        cambioGenerado: nombres.length > 0 ? nombres.join(', ') : 'Sin comunas',
      });
    }
    if (data.gruposInteresIds !== undefined && !idsEq(data.gruposInteresIds, prevGrupos)) {
      const nombres = proyectoActualizado.gruposInteres
        .map((g) => g.grupoInteres?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'los grupos de interés del proyecto',
        cambioGenerado: nombres.length > 0 ? nombres.join(', ') : 'Sin grupos de interés',
      });
    }
    if (data.sociosComunitariosIds !== undefined && !idsEq(data.sociosComunitariosIds, prevSocios)) {
      const nombres = proyectoActualizado.sociosComunitarios
        .map((s) => s.socioComunitario?.nombre)
        .filter(Boolean) as string[];
      historialEntries.push({
        elementoEspecifico: 'los socios comunitarios del proyecto',
        cambioGenerado: nombres.length > 0 ? nombres.join(', ') : 'Sin socios comunitarios',
      });
    }

    const DEFAULT_ELEMENTO_DESARROLLO_TECNICO: Record<string, string> = {
      continuidadFasesAnteriores: 'Continuidad de Fases Anteriores del proyecto',
      pertinenciaLocal: 'Pertinencia Local del proyecto',
      pertinenciaDisciplinar: 'Pertinencia Disciplinar del proyecto',
      necesidadProblema: 'Necesidad, Problema u Oportunidad del proyecto',
      publicoObjetivo: 'Público Objetivo del proyecto',
      solucionAvance: 'Solución o Avance del proyecto',
      perspectiveGenero: 'Perspectiva de Género del proyecto',
      resultadosContribucion: 'Resultados y Contribución Esperada del proyecto',
      metodologiaMedicion: 'Metodología y Medición del proyecto',
      ejesImpacto: 'Ejes de Impacto del proyecto',
      factorInnovador: 'Factor Innovador del proyecto',
      escalabilidad: 'Escalabilidad del proyecto',
    };

    const subcategoriasDt = await prisma.desarrolloTecnicoSubcategoria.findMany({
      where: { campoKey: { not: null } },
      select: { campoKey: true, nombre: true },
    });
    const ELEMENTO_DESARROLLO_TECNICO: Record<string, string> = {
      ...DEFAULT_ELEMENTO_DESARROLLO_TECNICO,
    };
    for (const sub of subcategoriasDt) {
      if (sub.campoKey && sub.nombre?.trim()) {
        ELEMENTO_DESARROLLO_TECNICO[sub.campoKey] =
          `${sub.nombre.trim()} del proyecto`;
      }
    }

    if (data.desarrolloTecnico !== undefined) {
      const dt = data.desarrolloTecnico;
      for (const [key, elementoEspecifico] of Object.entries(ELEMENTO_DESARROLLO_TECNICO)) {
        const rawNew = dt[key as keyof typeof dt];
        const rawPrev = prevDt?.[key as keyof typeof prevDt];
        const valorNuevo = typeof rawNew === 'string' ? rawNew.trim() : String(rawNew ?? '');
        const valorPrev = typeof rawPrev === 'string' ? rawPrev.trim() : String(rawPrev ?? '');
        if (valorNuevo !== valorPrev) {
          historialEntries.push({
            elementoEspecifico,
            cambioGenerado: dt[key as keyof typeof dt] ?? '',
          });
        }
      }
    }

    if (data.desarrolloTecnicoValores !== undefined) {
      const prevValoresBySub = new Map(
        (prev?.desarrolloTecnicoValores ?? []).map((v) => [
          v.subcategoriaId,
          v.valor ?? '',
        ])
      );
      const subIds = data.desarrolloTecnicoValores.map((v) => v.subcategoriaId);
      const subsMeta = await prisma.desarrolloTecnicoSubcategoria.findMany({
        where: { id: { in: subIds } },
        select: { id: true, nombre: true },
      });
      const nombreById = new Map(subsMeta.map((s) => [s.id, s.nombre]));
      for (const item of data.desarrolloTecnicoValores) {
        const valorNuevo = item.valor?.trim() ?? '';
        const valorPrev = (prevValoresBySub.get(item.subcategoriaId) ?? '').trim();
        if (valorNuevo !== valorPrev) {
          const nombre =
            nombreById.get(item.subcategoriaId)?.trim() || 'elemento de desarrollo técnico';
          historialEntries.push({
            elementoEspecifico: `${nombre} del proyecto`,
            cambioGenerado: item.valor ?? '',
          });
        }
      }
    }

    if (historialEntries.length > 0) {
      await createHistorialEntriesBatch(
        data.proyectoId,
        'Actualizar',
        'General',
        historialEntries
      );
    }

    revalidateTag('proyectos-dashboard');

    const [ytRow] = await prisma.$queryRaw<{ youtube_url: string | null }[]>`
      SELECT youtube_url FROM proyectos WHERE id = ${data.proyectoId}
    `.catch(() => [{ youtube_url: null }]);
    const out = {
      ...proyectoActualizado,
      youtubeUrl: ytRow?.youtube_url ?? null,
    };
    return {
      success: true,
      data: out as ProyectoWithRelations,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error updating general tab:', error);
    return {
      success: false,
      error: `Error al actualizar el proyecto: ${message}`,
    };
  }
}

/**
 * Crear un objetivo específico para un proyecto (desde la sección Indicadores).
 */
export async function createObjetivoEspecifico(
  proyectoId: string,
  descripcion: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    const trimmed = descripcion?.trim();
    if (!trimmed) {
      return { success: false, error: 'La descripción no puede estar vacía' };
    }
    const especificos = await prisma.objetivoProyecto.findMany({
      where: { proyectoId, tipo: 'Especifico' },
      select: { orden: true },
      orderBy: { orden: 'desc' },
      take: 1,
    });
    const nextOrden = especificos.length > 0 ? especificos[0].orden + 1 : 1;
    await prisma.objetivoProyecto.create({
      data: {
        proyectoId,
        tipo: 'Especifico',
        descripcion: trimmed,
        orden: nextOrden,
      },
    });
    await createHistorialEntry({
      proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Indicadores',
      elementoEspecifico: 'Objetivos Específicos del proyecto',
      cambioGenerado: `Objetivo específico agregado: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? '…' : ''}`,
    });
    revalidateTag('proyectos-dashboard');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error creating objetivo específico:', error);
    return {
      success: false,
      error: `Error al crear el objetivo específico: ${message}`,
    };
  }
}

/**
 * Eliminar un proyecto
 */
export async function deleteProyecto(id: string) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return { success: false, error: gate.error };

    await prisma.proyecto.delete({
      where: { id },
    });

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true };
  } catch (error) {
    console.error('Error deleting proyecto:', error);
    return { success: false, error: 'Error al eliminar proyecto' };
  }
}

// ===== FUNCIONES PARA CATÁLOGOS =====

/**
 * Obtener todas las escuelas
 */
export async function getEscuelas(): Promise<CatalogoResponse<Escuela>> {
  try {
    const escuelas = await prisma.escuela.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: escuelas };
  } catch (error) {
    console.error('Error getting escuelas:', error);
    return { success: false, error: 'Error al obtener escuelas' };
  }
}

/**
 * Obtener todas las carreras
 */
export async function getCarreras(): Promise<CatalogoResponse<Carrera>> {
  try {
    const carreras = await prisma.carrera.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: carreras };
  } catch (error) {
    console.error('Error getting carreras:', error);
    return { success: false, error: 'Error al obtener carreras' };
  }
}

/**
 * Obtener todas las asignaturas
 */
export async function getAsignaturas(): Promise<CatalogoResponse<Asignatura>> {
  try {
    const asignaturas = await prisma.asignatura.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: asignaturas };
  } catch (error) {
    console.error('Error getting asignaturas:', error);
    return { success: false, error: 'Error al obtener asignaturas' };
  }
}

/**
 * Obtener todas las comunas
 */
export async function getComunas(): Promise<CatalogoResponse<Comuna>> {
  try {
    const comunas = await prisma.comuna.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: comunas };
  } catch (error) {
    console.error('Error getting comunas:', error);
    return { success: false, error: 'Error al obtener comunas' };
  }
}

/**
 * Obtener todos los grupos de interés
 */
export async function getGruposInteres(): Promise<
  CatalogoResponse<GrupoInteres>
> {
  try {
    const grupos = await prisma.grupoInteres.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: grupos };
  } catch (error) {
    console.error('Error getting grupos interes:', error);
    return { success: false, error: 'Error al obtener grupos de interés' };
  }
}

/**
 * Obtener todos los socios comunitarios
 */
export async function getSociosComunitarios(): Promise<
  CatalogoResponse<SocioComunitario>
> {
  try {
    const socios = await prisma.socioComunitario.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: socios };
  } catch (error) {
    console.error('Error getting socios comunitarios:', error);
    return { success: false, error: 'Error al obtener socios comunitarios' };
  }
}

type CatalogosGeneralData = {
  escuelas: { id: string; nombre: string; codigo: string }[];
  carreras: { id: string; nombre: string }[];
  asignaturas: { id: string; nombre: string }[];
  comunas: { id: string; nombre: string; region: string }[];
  gruposInteres: { id: string; nombre: string; descripcion: string | null }[];
  sociosComunitarios: {
    id: string;
    nombre: string;
    descripcion: string | null;
  }[];
  sedes: { id: string; nombre: string; orden: number }[];
  fondos: { id: string; nombre: string; orden: number }[];
  lineas: {
    id: string;
    nombre: string;
    orden: number;
    fondoId: string;
    fondoNombre: string;
  }[];
};

/**
 * Obtener todos los catálogos del tab General en una sola round-trip.
 * Evita 7 server actions separadas al editar/crear proyectos.
 */
export async function getCatalogosGeneral(): Promise<{
  success: boolean;
  data?: CatalogosGeneralData;
  error?: string;
}> {
  try {
    const [
      escuelas,
      carreras,
      asignaturas,
      comunas,
      gruposInteres,
      sociosComunitarios,
      sedes,
      fondos,
      lineasRaw,
    ] = await Promise.all([
      prisma.escuela.findMany({
        select: { id: true, nombre: true, codigo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.carrera.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.asignatura.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.comuna.findMany({
        select: { id: true, nombre: true, region: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.grupoInteres.findMany({
        select: { id: true, nombre: true, descripcion: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.socioComunitario.findMany({
        select: { id: true, nombre: true, descripcion: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.sede.findMany({
        select: { id: true, nombre: true, orden: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.fondo.findMany({
        select: { id: true, nombre: true, orden: true },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.linea.findMany({
        select: {
          id: true,
          nombre: true,
          orden: true,
          fondoId: true,
          fondo: { select: { nombre: true } },
        },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      }),
    ]);

    return {
      success: true,
      data: {
        escuelas,
        carreras,
        asignaturas,
        comunas,
        gruposInteres,
        sociosComunitarios,
        sedes,
        fondos,
        lineas: lineasRaw.map((l) => ({
          id: l.id,
          nombre: l.nombre,
          orden: l.orden,
          fondoId: l.fondoId,
          fondoNombre: l.fondo.nombre,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting catalogos general:', error);
    return { success: false, error: 'Error al obtener catálogos' };
  }
}

/**
 * Crear un nuevo socio comunitario (catálogo macro interproyecto).
 * Requiere acceso al proyecto desde el que se crea — no es Configuración/Ajustes.
 */
export async function createSocioComunitario(
  nombre: string,
  descripcion: string | undefined,
  proyectoId: string
) {
  try {
    if (!proyectoId) {
      return { success: false, error: 'Proyecto no especificado' };
    }

    const gate = catalogCreateRequiresAjustes('socio_comunitario')
      ? await requirePermission('view.ajustes')
      : await requireProjectAccess(proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    const socio = await prisma.socioComunitario.create({
      data: {
        nombre,
        descripcion,
      },
    });
    return { success: true, data: socio };
  } catch (error) {
    console.error('Error creating socio comunitario:', error);
    return { success: false, error: 'Error al crear socio comunitario' };
  }
}
