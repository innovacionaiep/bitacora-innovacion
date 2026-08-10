'use server';

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import { createActivity, createTask } from '@/lib/actions/gantt';
import { addParticipanteProyecto } from '@/lib/actions/proyectos-participantes';
import { computeAvancePresupuestoPct } from '@/lib/utils/presupuesto-calculos';

async function assertCanManageFondos() {
  const session = await getSession();
  const availableRoles =
    (session?.user as { availableRoles?: string[] } | undefined)
      ?.availableRoles ?? [];
  const can = await userHasPermission(availableRoles, 'view.fondos');
  if (!can) {
    return { ok: false as const, error: 'No tienes permiso para esta acción' };
  }
  return { ok: true as const };
}

async function assertFondoExists(fondoNombre: string): Promise<string | null> {
  const nombre = fondoNombre?.trim();
  if (!nombre) return 'El fondo es obligatorio';
  const fondo = await prisma.fondo.findFirst({
    where: { nombre },
    select: { id: true },
  });
  if (!fondo) return 'Fondo no encontrado en el catálogo';
  return null;
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type BulkActivityPreviewProyecto = {
  id: string;
  proyecto: string;
};

export type BulkActivityTaskInput = {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateBulkActivityTask(
  task: BulkActivityTaskInput | undefined
): { ok: true; task: BulkActivityTaskInput } | { ok: false; error: string } {
  if (!task) {
    return {
      ok: false,
      error: 'Debes incluir al menos una tarea con fechas para la actividad',
    };
  }
  const name = task.name?.trim() ?? '';
  if (!name) {
    return { ok: false, error: 'El nombre de la tarea es obligatorio' };
  }
  if (name.length > 70) {
    return {
      ok: false,
      error: 'El nombre de la tarea no puede exceder 70 caracteres',
    };
  }
  const startDate = task.startDate?.trim() ?? '';
  const endDate = task.endDate?.trim() ?? '';
  if (!startDate || !endDate) {
    return {
      ok: false,
      error: 'Las fechas de inicio y fin de la tarea son obligatorias',
    };
  }
  if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate)) {
    return {
      ok: false,
      error: 'Las fechas de la tarea deben tener formato YYYY-MM-DD',
    };
  }
  if (startDate > endDate) {
    return {
      ok: false,
      error: 'La fecha de inicio no puede ser posterior a la fecha de fin',
    };
  }
  return {
    ok: true,
    task: {
      name,
      description: task.description?.trim() ?? '',
      startDate,
      endDate,
    },
  };
}

export type FondoGestionProyecto = {
  id: string;
  proyecto: string;
  linea: string | null;
  sede: string;
  avanceGantt: number;
  /** % objetivo general (promedio de OEs/indicadores), campo `objetivos`. */
  avanceIndicadores: number;
  /** % alineado con tab Presupuesto (pctGlobalAvance). */
  avancePresupuesto: number;
  convenioFirmado: boolean;
};

/** Coordinador presente en uno o más proyectos del fondo. */
export type FondoCoordinadorResumen = {
  email: string;
  nombre: string;
  proyectoCount: number;
  totalProyectos: number;
  /** En todos los proyectos — típico de carga masiva. */
  enTodos: boolean;
};

export type FondoGestionData = {
  fondoNombre: string;
  conveniosEnabled: boolean;
  proyectos: FondoGestionProyecto[];
  coordinadores: FondoCoordinadorResumen[];
  kpis: {
    total: number;
    avanceGanttPromedio: number;
    avanceIndicadoresPromedio: number;
    avancePresupuestoPromedio: number;
    conveniosFirmados: number;
    conveniosPendientes: number;
  };
};

export async function getFondoGestionData(fondoNombre: string): Promise<{
  success: boolean;
  data?: FondoGestionData;
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const nombre = fondoNombre.trim();
    const fondo = await prisma.fondo.findFirst({
      where: { nombre },
      select: { nombre: true, conveniosEnabled: true },
    });
    if (!fondo) {
      return { success: false, error: 'Fondo no encontrado en el catálogo' };
    }

    const rows = await prisma.proyecto.findMany({
      where: { fondo: nombre },
      select: {
        id: true,
        proyecto: true,
        linea: true,
        sede: true,
        avanceGantt: true,
        objetivos: true,
        presupuestoAdjudicado: true,
        convenioFirmadoUrl: true,
      },
      orderBy: { proyecto: 'asc' },
    });

    const proyectoIds = rows.map((p) => p.id);
    const [itemsPresupuesto, participantesCoord] =
      proyectoIds.length > 0
        ? await Promise.all([
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
            prisma.proyectoParticipante.findMany({
              where: {
                rol: 'Coordinador',
                proyectoId: { in: proyectoIds },
                email: { not: null },
              },
              select: {
                email: true,
                nombre: true,
                proyectoId: true,
              },
            }),
          ])
        : [[], []];

    const itemsByProyecto = new Map<string, typeof itemsPresupuesto>();
    for (const item of itemsPresupuesto) {
      const list = itemsByProyecto.get(item.proyectoId) ?? [];
      list.push(item);
      itemsByProyecto.set(item.proyectoId, list);
    }

    const proyectos: FondoGestionProyecto[] = rows.map((p) => ({
      id: p.id,
      proyecto: p.proyecto,
      linea: p.linea,
      sede: p.sede,
      avanceGantt: p.avanceGantt,
      avanceIndicadores: p.objetivos,
      avancePresupuesto: computeAvancePresupuestoPct(
        itemsByProyecto.get(p.id) ?? [],
        p.presupuestoAdjudicado ?? 0
      ),
      convenioFirmado: Boolean(p.convenioFirmadoUrl),
    }));

    const total = proyectos.length;
    const byEmail = new Map<
      string,
      { email: string; nombre: string; proyectoIds: Set<string> }
    >();
    for (const part of participantesCoord) {
      if (!part.email) continue;
      const key = normEmail(part.email);
      const existing = byEmail.get(key);
      if (existing) {
        existing.proyectoIds.add(part.proyectoId);
        if (!existing.nombre.trim() && part.nombre?.trim()) {
          existing.nombre = part.nombre.trim();
        }
      } else {
        byEmail.set(key, {
          email: part.email.trim(),
          nombre: part.nombre?.trim() || part.email.trim(),
          proyectoIds: new Set([part.proyectoId]),
        });
      }
    }
    const coordinadores: FondoCoordinadorResumen[] = Array.from(
      byEmail.values()
    )
      .map((c) => {
        const proyectoCount = c.proyectoIds.size;
        return {
          email: c.email,
          nombre: c.nombre,
          proyectoCount,
          totalProyectos: total,
          enTodos: total > 0 && proyectoCount >= total,
        };
      })
      .sort((a, b) => {
        if (a.enTodos !== b.enTodos) return a.enTodos ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

    const avg = (pick: (p: FondoGestionProyecto) => number) =>
      total === 0
        ? 0
        : Math.round(proyectos.reduce((sum, p) => sum + pick(p), 0) / total);
    const conveniosFirmados = proyectos.filter((p) => p.convenioFirmado).length;
    const conveniosPendientes = fondo.conveniosEnabled
      ? total - conveniosFirmados
      : 0;

    return {
      success: true,
      data: {
        fondoNombre: fondo.nombre,
        conveniosEnabled: fondo.conveniosEnabled,
        proyectos,
        coordinadores,
        kpis: {
          total,
          avanceGanttPromedio: avg((p) => p.avanceGantt),
          avanceIndicadoresPromedio: avg((p) => p.avanceIndicadores),
          avancePresupuestoPromedio: avg((p) => p.avancePresupuesto),
          conveniosFirmados,
          conveniosPendientes,
        },
      },
    };
  } catch (e) {
    console.error('getFondoGestionData', e);
    return { success: false, error: 'Error al cargar datos del fondo' };
  }
}

export async function previewBulkActivityFondo(input: {
  fondoNombre: string;
  name: string;
  description?: string;
  task: BulkActivityTaskInput;
}): Promise<{
  success: boolean;
  proyectos?: BulkActivityPreviewProyecto[];
  name?: string;
  description?: string;
  task?: BulkActivityTaskInput;
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const fondoError = await assertFondoExists(input.fondoNombre);
    if (fondoError) return { success: false, error: fondoError };

    const name = input.name?.trim() ?? '';
    if (!name) {
      return { success: false, error: 'El nombre de la actividad es obligatorio' };
    }
    if (name.length > 70) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 70 caracteres',
      };
    }

    const taskResult = validateBulkActivityTask(input.task);
    if (!taskResult.ok) {
      return { success: false, error: taskResult.error };
    }

    const fondoNombre = input.fondoNombre.trim();
    const proyectos = await prisma.proyecto.findMany({
      where: { fondo: fondoNombre },
      select: { id: true, proyecto: true },
      orderBy: { proyecto: 'asc' },
    });

    return {
      success: true,
      proyectos,
      name,
      description: input.description?.trim() ?? '',
      task: taskResult.task,
    };
  } catch (e) {
    console.error('previewBulkActivityFondo', e);
    return { success: false, error: 'Error al preparar la vista previa' };
  }
}

export async function confirmBulkActivityFondo(input: {
  fondoNombre: string;
  name: string;
  description?: string;
  task: BulkActivityTaskInput;
  proyectoIds: string[];
}): Promise<{
  success: boolean;
  created?: number;
  errors?: { proyectoId: string; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const fondoError = await assertFondoExists(input.fondoNombre);
    if (fondoError) return { success: false, error: fondoError };

    const name = input.name?.trim() ?? '';
    if (!name) {
      return { success: false, error: 'El nombre de la actividad es obligatorio' };
    }
    if (name.length > 70) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 70 caracteres',
      };
    }

    const taskResult = validateBulkActivityTask(input.task);
    if (!taskResult.ok) {
      return { success: false, error: taskResult.error };
    }
    const task = taskResult.task;

    const fondoNombre = input.fondoNombre.trim();
    const description = input.description?.trim() ?? '';
    const ids = Array.from(new Set(input.proyectoIds ?? [])).filter(Boolean);
    if (ids.length === 0) {
      return { success: false, error: 'No hay proyectos seleccionados' };
    }

    const validProjects = await prisma.proyecto.findMany({
      where: {
        id: { in: ids },
        fondo: fondoNombre,
      },
      select: { id: true },
    });
    const validIds = new Set(validProjects.map((p) => p.id));

    let created = 0;
    const errors: { proyectoId: string; error: string }[] = [];

    for (const proyectoId of ids) {
      if (!validIds.has(proyectoId)) {
        errors.push({
          proyectoId,
          error: 'El proyecto no pertenece a este fondo',
        });
        continue;
      }

      const activityResult = await createActivity(
        {
          name,
          description,
          projectId: proyectoId,
          color: 'bg-gray-700',
          progress: 0,
          orderIndex: 0,
          kanbanOrderIndex: 0,
          status: 'TODO',
        },
        { skipRevalidate: true }
      );

      if (!activityResult.success || !activityResult.data) {
        errors.push({
          proyectoId,
          error: activityResult.error ?? 'Error al crear actividad',
        });
        continue;
      }

      const taskCreateResult = await createTask(
        {
          name: task.name,
          description: task.description ?? '',
          startDate: task.startDate,
          endDate: task.endDate,
          activityId: activityResult.data.id,
          completed: false,
          progress: 0,
        },
        { skipRevalidate: true }
      );

      if (!taskCreateResult.success) {
        errors.push({
          proyectoId,
          error:
            taskCreateResult.error ??
            'Actividad creada, pero falló la creación de la tarea',
        });
        continue;
      }

      created += 1;
    }

    return { success: true, created, errors };
  } catch (e) {
    console.error('confirmBulkActivityFondo', e);
    return { success: false, error: 'Error al crear las actividades' };
  }
}

export type BulkCoordinadorInput = {
  nombre: string;
  email: string;
  rut?: string | null;
  cargo?: string | null;
  sedeId?: string | null;
  escuelaId?: string | null;
};

export type BulkCoordinadorPreviewRow = {
  proyectoId: string;
  proyecto: string;
  email: string;
  nombre: string;
  rut?: string | null;
  cargo?: string | null;
  sedeId?: string | null;
  escuelaId?: string | null;
  sedeNombre?: string | null;
  escuelaNombre?: string | null;
  action: 'crear' | 'omitir';
  reason?: string;
};

export async function previewBulkCoordinadoresFondo(input: {
  fondoNombre: string;
  coordinadores: BulkCoordinadorInput[];
}): Promise<{
  success: boolean;
  rows?: BulkCoordinadorPreviewRow[];
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const fondoError = await assertFondoExists(input.fondoNombre);
    if (fondoError) return { success: false, error: fondoError };

    const coords = (input.coordinadores ?? [])
      .map((c) => ({
        nombre: c.nombre?.trim() || c.email.trim(),
        email: c.email?.trim() ?? '',
        rut: c.rut?.trim() || null,
        cargo: c.cargo?.trim() || null,
        sedeId: c.sedeId || null,
        escuelaId: c.escuelaId || null,
      }))
      .filter((c) => c.email);
    if (coords.length === 0) {
      return {
        success: false,
        error: 'Selecciona al menos un coordinador',
      };
    }

    const uniqueByEmail = new Map<string, BulkCoordinadorInput>();
    for (const c of coords) {
      uniqueByEmail.set(normEmail(c.email), c);
    }
    const coordinadores = Array.from(uniqueByEmail.values());

    const fondoNombre = input.fondoNombre.trim();
    const proyectos = await prisma.proyecto.findMany({
      where: { fondo: fondoNombre },
      select: {
        id: true,
        proyecto: true,
        participantes_rel: {
          where: { rol: 'Coordinador' },
          select: { email: true },
        },
      },
      orderBy: { proyecto: 'asc' },
    });

    const rows: BulkCoordinadorPreviewRow[] = [];
    for (const p of proyectos) {
      const existing = new Set(
        p.participantes_rel
          .map((x) => (x.email ? normEmail(x.email) : ''))
          .filter(Boolean)
      );
      for (const c of coordinadores) {
        const emailKey = normEmail(c.email);
        if (existing.has(emailKey)) {
          rows.push({
            proyectoId: p.id,
            proyecto: p.proyecto,
            email: c.email,
            nombre: c.nombre,
            rut: c.rut,
            cargo: c.cargo,
            sedeId: c.sedeId,
            escuelaId: c.escuelaId,
            action: 'omitir',
            reason: 'Ya es coordinador en este proyecto',
          });
        } else {
          rows.push({
            proyectoId: p.id,
            proyecto: p.proyecto,
            email: c.email,
            nombre: c.nombre,
            rut: c.rut,
            cargo: c.cargo,
            sedeId: c.sedeId,
            escuelaId: c.escuelaId,
            action: 'crear',
          });
        }
      }
    }

    return { success: true, rows };
  } catch (e) {
    console.error('previewBulkCoordinadoresFondo', e);
    return { success: false, error: 'Error al preparar la vista previa' };
  }
}

export async function confirmBulkCoordinadoresFondo(input: {
  fondoNombre: string;
  items: Array<{
    proyectoId: string;
    nombre: string;
    email: string;
    rut?: string | null;
    cargo?: string | null;
    sedeId?: string | null;
    escuelaId?: string | null;
  }>;
}): Promise<{
  success: boolean;
  created?: number;
  skipped?: number;
  errors?: { proyectoId: string; email: string; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const fondoError = await assertFondoExists(input.fondoNombre);
    if (fondoError) return { success: false, error: fondoError };

    const fondoNombre = input.fondoNombre.trim();
    const items = input.items ?? [];
    if (items.length === 0) {
      return { success: false, error: 'No hay altas pendientes' };
    }

    const proyectoIds = Array.from(new Set(items.map((i) => i.proyectoId)));
    const validProjects = await prisma.proyecto.findMany({
      where: { id: { in: proyectoIds }, fondo: fondoNombre },
      select: {
        id: true,
        participantes_rel: {
          where: { rol: 'Coordinador' },
          select: { email: true },
        },
      },
    });
    const byId = new Map(
      validProjects.map((p) => [
        p.id,
        new Set(
          p.participantes_rel
            .map((x) => (x.email ? normEmail(x.email) : ''))
            .filter(Boolean)
        ),
      ])
    );

    let created = 0;
    let skipped = 0;
    const errors: { proyectoId: string; email: string; error: string }[] = [];

    for (const item of items) {
      const existing = byId.get(item.proyectoId);
      if (!existing) {
        errors.push({
          proyectoId: item.proyectoId,
          email: item.email,
          error: 'El proyecto no pertenece a este fondo',
        });
        continue;
      }
      const emailKey = normEmail(item.email);
      if (existing.has(emailKey)) {
        skipped += 1;
        continue;
      }

      const result = await addParticipanteProyecto(item.proyectoId, {
        rol: 'Coordinador',
        nombre: item.nombre,
        email: item.email,
        rut: item.rut ?? undefined,
        cargo: item.cargo ?? undefined,
        sedeId: item.sedeId ?? undefined,
        escuelaId: item.escuelaId ?? undefined,
      });

      if (result.success) {
        created += 1;
        existing.add(emailKey);
      } else {
        errors.push({
          proyectoId: item.proyectoId,
          email: item.email,
          error: result.error ?? 'Error al agregar coordinador',
        });
      }
    }

    return { success: true, created, skipped, errors };
  } catch (e) {
    console.error('confirmBulkCoordinadoresFondo', e);
    return { success: false, error: 'Error al agregar coordinadores' };
  }
}

/** Fondos del catálogo con conteo de proyectos (navegación del panel). */
export async function getFondosNavItems(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    nombre: string;
    orden: number;
    conveniosEnabled: boolean;
    projectCount: number;
  }>;
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const fondos = await prisma.fondo.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        orden: true,
        conveniosEnabled: true,
      },
    });

    const counts = await prisma.proyecto.groupBy({
      by: ['fondo'],
      _count: { _all: true },
    });
    const countByNombre = new Map(
      counts.map((c) => [c.fondo, c._count._all])
    );

    return {
      success: true,
      data: fondos.map((f) => ({
        ...f,
        projectCount: countByNombre.get(f.nombre) ?? 0,
      })),
    };
  } catch (e) {
    console.error('getFondosNavItems', e);
    return { success: false, error: 'Error al cargar fondos' };
  }
}

/** Lista ligera de proyectos de un fondo (para paneles). */
export async function getProyectosPorFondoNombre(fondoNombre: string): Promise<{
  success: boolean;
  data?: { id: string; proyecto: string }[];
  error?: string;
}> {
  try {
    const auth = await assertCanManageFondos();
    if (!auth.ok) return { success: false, error: auth.error };

    const data = await prisma.proyecto.findMany({
      where: { fondo: fondoNombre },
      select: { id: true, proyecto: true },
      orderBy: { proyecto: 'asc' },
    });
    return { success: true, data };
  } catch (e) {
    console.error('getProyectosPorFondoNombre', e);
    return { success: false, error: 'Error al listar proyectos del fondo' };
  }
}
