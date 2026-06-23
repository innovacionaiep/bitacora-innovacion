'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { createHistorialEntry } from './historial';
import { getCurrentUser, getSession } from '@/lib/auth-utils';
import {
  Proyecto,
  Escuela,
  Carrera,
  Comuna,
  GrupoInteres,
  SocioComunitario,
} from '@prisma/client';
import {
  ProyectoFormData,
  ProyectoFormPayload,
  ProyectoWithRelations,
  CatalogoResponse,
} from '@/types/proyecto';
import { createActivity, createTask } from '@/lib/actions/gantt';
import { createIndicador } from '@/lib/actions/indicadores';
import { createItemPresupuesto } from '@/lib/actions/presupuesto';
import { getMesAnteriorInfo } from '@/lib/utils/fecha';

export type ProyectoData = Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>;

// Tipo extendido para proyectos con variaciones
export type ProyectoConVariaciones = ProyectoWithRelations & {
  variacionGantt: number;
  variacionObjetivos: number;
};

export type GeneralTabUpdateData = {
  proyectoId: string;
  proyecto?: string;
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
};

/**
 * Función interna para obtener proyectos de la BD (sin caché).
 * Si whereIds está definido, solo devuelve esos proyectos.
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
          sede: { select: { id: true, nombre: true } },
          escuela: { select: { id: true, nombre: true } },
        },
      },
      escuelas: { include: { escuela: true } },
      carreras: { include: { carrera: true } },
      comunas: { include: { comuna: true } },
      gruposInteres: { include: { grupoInteres: true } },
      snapshotsMensuales: {
        where: { mes: mesAnterior, anio: anioMesAnterior },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return proyectos.map((proyecto) => {
    const snapshotMesAnterior = proyecto.snapshotsMensuales[0];
    const variacionGantt = snapshotMesAnterior
      ? proyecto.avanceGantt - snapshotMesAnterior.avanceGantt
      : 0;
    const variacionObjetivos = snapshotMesAnterior
      ? proyecto.objetivos - snapshotMesAnterior.objetivos
      : 0;
    const { snapshotsMensuales, ...proyectoSinSnapshots } = proyecto;
    return {
      ...proyectoSinSnapshots,
      variacionGantt,
      variacionObjetivos,
    } as ProyectoConVariaciones;
  });
}

/**
 * Obtener todos los proyectos con relaciones y variaciones mensuales
 * Con caché de 30 segundos para mejorar rendimiento
 */
export async function getProyectos() {
  try {
    console.log('🔍 [getProyectos] Iniciando consulta a la base de datos...');

    // Caché global solo para listado Admin (getProyectos). Dashboard usa getProyectosDashboard sin caché compartida.
    const cachedGetProyectos = unstable_cache(
      async () => {
        return await _getProyectosFromDB();
      },
      ['proyectos-list'],
      {
        revalidate: 30, // Revalidar cada 30 segundos
        tags: ['proyectos'],
      }
    );

    const proyectosConVariaciones = await cachedGetProyectos();

    console.log(
      `✅ [getProyectos] Encontrados ${proyectosConVariaciones.length} proyectos`
    );

    return { success: true, data: proyectosConVariaciones };
  } catch (error) {
    console.error('❌ [getProyectos] Error:', error);
    return { success: false, error: 'Error al obtener proyectos' };
  }
}

/**
 * Proyectos optimizados para el dashboard (sin grafo completo innecesario).
 */
export async function getProyectosDashboard() {
  try {
    const cachedGetProyectosDashboard = unstable_cache(
      async () => _getProyectosDashboardFromDB(),
      ['proyectos-dashboard-list'],
      {
        revalidate: 45,
        tags: ['proyectos-dashboard'],
      }
    );

    const proyectosConVariaciones = await cachedGetProyectosDashboard();
    return { success: true, data: proyectosConVariaciones };
  } catch (error) {
    console.error('❌ [getProyectosDashboard] Error:', error);
    return { success: false, error: 'Error al obtener proyectos' };
  }
}

/**
 * Obtener proyectos filtrados por usuario y rol activo.
 * - Admin: ven todos los proyectos.
 * - Otros roles: solo proyectos donde participan con ese rol en ProyectoParticipante.
 * @param activeRoleOverride - Rol a usar en lugar del de la sesión (evita esperar sync al cambiar rol)
 */
export async function getProyectosParaUsuarioPorRolActivo(
  activeRoleOverride?: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    const activeRole =
      activeRoleOverride ?? (user as { activeRole?: string | null }).activeRole ?? null;

    // Solo Admin ve todos los proyectos. Coordinadores, Encargados y demás roles
    // solo ven proyectos donde participan con ese rol en ProyectoParticipante.
    if (activeRole === 'Admin') {
      const result = await _getProyectosFromDB();
      return { success: true, data: result };
    }

    // Sin rol activo: no hay proyectos para mostrar
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

    const proyectos = await _getProyectosFromDB(proyectoIds);
    return { success: true, data: proyectos };
  } catch (error) {
    console.error('❌ [getProyectosParaUsuarioPorRolActivo] Error:', error);
    return { success: false, error: 'Error al obtener proyectos', data: [] };
  }
}

/** Tipo mínimo para el listado del selector (carga rápida) */
export type ProyectoListadoItem = {
  id: string;
  proyecto: string;
  sede: string;
  escuelas: { escuela: { nombre: string } }[];
};

/**
 * Listado ligero de proyectos para el selector (solo id, nombre, sede, escuelas).
 * Carga instantánea; los detalles completos se cargan al seleccionar.
 */
export async function getProyectosListadoParaUsuario(
  activeRoleOverride?: string | null
) {
  try {
    const user = await getCurrentUser();
    const activeRole =
      activeRoleOverride ?? (user as { activeRole?: string | null })?.activeRole ?? null;
    if (!user?.id) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }

    if (activeRole === 'Admin') {
      const proyectos = await prisma.proyecto.findMany({
        select: {
          id: true,
          proyecto: true,
          sede: true,
          escuelas: { include: { escuela: { select: { nombre: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: proyectos as ProyectoListadoItem[] };
    }

    if (!activeRole) {
      return { success: true, data: [] };
    }

    const userEmail = (user as { email?: string | null }).email ?? null;
    const participaciones = await prisma.proyectoParticipante.findMany({
      where: {
        rol: activeRole,
        OR: [
          { userId: user.id },
          ...(userEmail
            ? [
                {
                  userId: null,
                  email: { equals: userEmail, mode: 'insensitive' as const },
                },
              ]
            : []),
        ],
      },
      select: { proyectoId: true },
    });
    const proyectoIds = participaciones.map((p) => p.proyectoId);

    if (proyectoIds.length === 0) {
      return { success: true, data: [] };
    }

    const proyectos = await prisma.proyecto.findMany({
      where: { id: { in: proyectoIds } },
      select: {
        id: true,
        proyecto: true,
        sede: true,
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

export type GetProyectoOptions = {
  /** Si false, omite activities/tasks (carga más rápida al seleccionar proyecto). */
  includeActivities?: boolean;
};

/**
 * Obtener un proyecto por ID con todas las relaciones
 */
export async function getProyecto(
  id: string,
  options: GetProyectoOptions = {}
) {
  const { includeActivities = true } = options;
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        ...(includeActivities
          ? {
              activities: {
                include: {
                  tasks: true,
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
            }
          : {}),
        participantes_rel: {
          include: {
            user: true,
            socioComunitario: true,
            sede: true,
            escuela: true,
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
      },
    });

    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // Resolver nombre y avatar por email (prioridad cuenta registrada): participantes sin userId pero con email
    const emailsSinUser = [
      ...new Set(
        proyecto.participantes_rel
          .filter((p) => !p.userId && p.email?.trim())
          .map((p) => p.email!.trim())
      ),
    ];
    let userByEmailLower: Map<string, { name: string | null; image: string | null }> = new Map();
    if (emailsSinUser.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          OR: emailsSinUser.map((e) => ({
            email: { equals: e, mode: 'insensitive' as const },
          })),
        },
        select: { email: true, name: true, image: true },
      });
      users.forEach((u) => {
        if (u.email)
          userByEmailLower.set(u.email.toLowerCase(), {
            name: u.name ?? null,
            image: u.image ?? null,
          });
      });
    }
    const participantesEnriquecidos = proyecto.participantes_rel.map((p) => {
      const display =
        !p.user && p.email?.trim()
          ? userByEmailLower.get(p.email.trim().toLowerCase())
          : undefined;
      return {
        ...p,
        displayName:
          p.user?.name ?? display?.name ?? p.nombre ?? 'Sin nombre',
        displayImage: p.user?.image ?? display?.image ?? null,
      };
    });

    return {
      success: true,
      data: {
        ...proyecto,
        participantes_rel: participantesEnriquecidos,
      } as ProyectoWithRelations,
    };
  } catch (error) {
    console.error('Error getting proyecto:', error);
    return { success: false, error: 'Error al obtener proyecto' };
  }
}

export type CreateProyectoInput = ProyectoFormData & {
  youtubeUrl?: string | null;
};

/**
 * Crear un nuevo proyecto con todas las relaciones
 */
export async function createProyecto(data: CreateProyectoInput) {
  try {
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
    const session = await getSession();
    const currentUser = session?.user as { id?: string; email?: string; name?: string; activeRole?: string } | null;

    // Resolver userId por email para encargados/participantes que tengan cuenta
    const participantesRel = [...(payload.participantes_rel ?? [])];
    for (let i = 0; i < participantesRel.length; i++) {
      const p = participantesRel[i];
      const email = p.email?.trim();
      if (email) {
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        });
        if (user) {
          participantesRel[i] = { ...p, userId: user.id, nombre: (p.nombre?.trim() || user.name) ?? undefined, email: user.email };
        }
      }
    }

    // Si quien crea tiene rol activo "Encargado", agregarlo como encargado inicial si no está ya
    if (currentUser?.id && currentUser?.activeRole === 'Encargado') {
      const yaEsta = participantesRel.some(
        (p) => p.rol === 'Encargado' && (p.userId === currentUser.id || (p.email?.trim() && p.email.trim().toLowerCase() === (currentUser.email ?? '').toLowerCase()))
      );
      if (!yaEsta) {
        participantesRel.unshift({
          userId: currentUser.id,
          rol: 'Encargado',
          nombre: (currentUser.name as string) ?? undefined,
          email: (currentUser.email as string) ?? undefined,
        });
      }
    }

    // Si quien crea tiene rol activo "Coordinador", agregarlo como coordinador del proyecto si no está ya
    if (currentUser?.id && currentUser?.activeRole === 'Coordinador') {
      const yaEsta = participantesRel.some(
        (p) => p.rol === 'Coordinador' && (p.userId === currentUser.id || (p.email?.trim() && p.email.trim().toLowerCase() === (currentUser.email ?? '').toLowerCase()))
      );
      if (!yaEsta) {
        participantesRel.push({
          userId: currentUser.id,
          rol: 'Coordinador',
          nombre: (currentUser.name as string) ?? undefined,
          email: (currentUser.email as string) ?? undefined,
        });
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
    const full = await getProyecto(proyectoId);
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
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
        ...(data.fondo !== undefined && { fondo: data.fondo }),
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
    // Cargar estado previo para registrar en historial solo lo que realmente cambió
    const estadoAnterior = await prisma.proyecto.findUnique({
      where: { id: data.proyectoId },
      select: {
        proyecto: true,
        sede: true,
        escuelas: { select: { escuelaId: true } },
        carreras: { select: { carreraId: true } },
        comunas: { select: { comunaId: true } },
        gruposInteres: { select: { grupoInteresId: true } },
        sociosComunitarios: { select: { socioComunitarioId: true } },
        objetivos_rel: { orderBy: { orden: 'asc' }, select: { id: true, descripcion: true, orden: true, tipo: true } },
        desarrolloTecnico: true,
      },
    });

    const [row] = await prisma.$queryRaw<{ youtube_url: string | null }[]>`
      SELECT youtube_url FROM proyectos WHERE id = ${data.proyectoId}
    `.catch(() => [{ youtube_url: null }]);
    const estadoAnteriorYoutube = row?.youtube_url ?? null;

    await prisma.$transaction(async (tx) => {
      if (data.proyecto !== undefined || data.sede !== undefined) {
        await tx.proyecto.update({
          where: { id: data.proyectoId },
          data: {
            ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
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
    });

    // Cargar proyecto actualizado con relaciones para obtener nombres (para historial e respuesta)
    const proyectoActualizado = await prisma.proyecto.findUnique({
      where: { id: data.proyectoId },
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
      },
    });

    if (!proyectoActualizado) {
      return { success: false, error: 'Proyecto no encontrado tras actualizar' };
    }

    // Registrar en historial solo los campos que realmente cambiaron (comparar con estado anterior)
    const historialEntries: Array<{
      elementoEspecifico: string;
      cambioGenerado: string;
    }> = [];

    const prev = estadoAnterior;
    const prevEscuelas = prev?.escuelas.map((e) => e.escuelaId) ?? [];
    const prevCarreras = prev?.carreras.map((c) => c.carreraId) ?? [];
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

    const ELEMENTO_DESARROLLO_TECNICO: Record<string, string> = {
      continuidadFasesAnteriores: 'la Continuidad de Fases Anteriores del proyecto',
      pertinenciaLocal: 'la Pertinencia Local del proyecto',
      pertinenciaDisciplinar: 'la Pertinencia Disciplinar del proyecto',
      necesidadProblema: 'la Necesidad, Problema u Oportunidad del proyecto',
      publicoObjetivo: 'el Público Objetivo del proyecto',
      solucionAvance: 'la Solución o Avance del proyecto',
      perspectiveGenero: 'la Perspectiva de Género del proyecto',
      resultadosContribucion: 'los Resultados y Contribución Esperada del proyecto',
      metodologiaMedicion: 'la Metodología y Medición del proyecto',
      ejesImpacto: 'los Ejes de Impacto del proyecto',
      factorInnovador: 'el Factor Innovador del proyecto',
      escalabilidad: 'la Escalabilidad del proyecto',
    };

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

    for (const entry of historialEntries) {
      await createHistorialEntry({
        proyectoId: data.proyectoId,
        accion: 'Actualizar',
        tabProyecto: 'General',
        elementoEspecifico: entry.elementoEspecifico,
        cambioGenerado: entry.cambioGenerado,
      });
    }

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
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
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
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

// ===== FUNCIONES PARA PARTICIPANTES =====

const proyectoIncludeForParticipante = {
  participantes_rel: {
    include: {
      user: true,
      socioComunitario: true,
      sede: true,
      escuela: true,
    },
  },
  escuelas: { include: { escuela: true } },
  carreras: { include: { carrera: true } },
  comunas: { include: { comuna: true } },
  gruposInteres: { include: { grupoInteres: true } },
  sociosComunitarios: { include: { socioComunitario: true } },
  objetivos_rel: { orderBy: { orden: 'asc' as const } },
  desarrolloTecnico: true,
  desarrolloTecnicoValores: { include: { subcategoria: true } },
} as const;

export type AddParticipanteData = {
  rol: string;
  nombre?: string;
  email?: string;
  cargo?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
};

export async function addParticipanteProyecto(
  proyectoId: string,
  data: AddParticipanteData
) {
  try {
    let userId: string | null = null;
    let nombre = data.nombre ?? null;
    let email = data.email ?? null;
    if (data.email?.trim()) {
      const user = await prisma.user.findFirst({
        where: {
          email: { equals: data.email.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        userId = user.id;
        nombre = user.name ?? nombre;
        email = user.email;
      }
    }
    const participante = await prisma.proyectoParticipante.create({
      data: {
        proyectoId,
        userId,
        rol: data.rol,
        nombre,
        email,
        cargo: data.cargo ?? null,
        socioComunitarioId:
          data.rol === 'Beneficiario'
            ? (data.socioComunitarioId ?? null)
            : null,
        sedeId: data.sedeId ?? null,
        escuelaId: data.escuelaId ?? null,
      },
    });
    await createHistorialEntry({
      proyectoId,
      accion: 'Agregar participante',
      tabProyecto: 'Participantes',
      elementoEspecifico: `a un nuevo ${data.rol}`,
      cambioGenerado: data.nombre ?? '',
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error adding participante:', error);
    return {
      success: false,
      error: 'Error al agregar participante',
    };
  }
}

export type UpdateParticipanteData = {
  rol?: string;
  nombre?: string;
  email?: string;
  cargo?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
};

export async function updateParticipanteProyecto(
  participanteId: string,
  data: UpdateParticipanteData
) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    const finalRol = data.rol ?? existing.rol;
    let resolvedUserId: string | null = existing.userId;
    let resolvedNombre: string | null = data.nombre !== undefined ? data.nombre : existing.nombre;
    let resolvedEmail: string | null = data.email !== undefined ? data.email : existing.email;
    if (data.email !== undefined && data.email?.trim()) {
      const user = await prisma.user.findFirst({
        where: {
          email: { equals: data.email.trim(), mode: 'insensitive' },
        },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        resolvedUserId = user.id;
        resolvedNombre = user.name ?? resolvedNombre;
        resolvedEmail = user.email;
      } else {
        resolvedUserId = null;
        resolvedEmail = data.email.trim();
      }
    }
    const updateData = {
      ...(data.rol !== undefined && { rol: data.rol }),
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.email !== undefined && {
        nombre: resolvedNombre,
        email: resolvedEmail,
        userId: resolvedUserId,
      }),
      ...(data.cargo !== undefined && { cargo: data.cargo }),
      ...(data.socioComunitarioId !== undefined && {
        socioComunitarioId:
          finalRol === 'Beneficiario' ? data.socioComunitarioId : null,
      }),
      ...(data.sedeId !== undefined && { sedeId: data.sedeId || null }),
      ...(data.escuelaId !== undefined && {
        escuelaId: data.escuelaId || null,
      }),
    };
    await prisma.proyectoParticipante.update({
      where: { id: participanteId },
      data: updateData,
    });
    const nombreParticipante = existing.nombre || existing.rol || 'Participante';
    await createHistorialEntry({
      proyectoId: existing.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Participantes',
      elementoEspecifico: `los datos del ${existing.rol}`,
      cambioGenerado: nombreParticipante,
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error updating participante:', error);
    return {
      success: false,
      error: 'Error al actualizar participante',
    };
  }
}

export async function deleteParticipanteProyecto(participanteId: string) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    const nombreParticipante = existing.nombre || existing.rol || 'Participante';
    await prisma.proyectoParticipante.delete({
      where: { id: participanteId },
    });
    await createHistorialEntry({
      proyectoId: existing.proyectoId,
      accion: 'Eliminar participante',
      tabProyecto: 'Participantes',
      elementoEspecifico: `al ${existing.rol}`,
      cambioGenerado: nombreParticipante,
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error deleting participante:', error);
    return {
      success: false,
      error: 'Error al eliminar participante',
    };
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

/**
 * Crear un nuevo socio comunitario
 */
export async function createSocioComunitario(
  nombre: string,
  descripcion?: string
) {
  try {
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
