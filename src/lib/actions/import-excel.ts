'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSession } from '@/lib/auth-utils';
import {
  userHasPermission,
  userCanOnProject,
} from '@/lib/permissions/check';
import {
  createProyecto,
  updateProyectoGeneralTab,
} from '@/lib/actions/proyectos';
import { addParticipanteProyecto } from '@/lib/actions/proyectos-participantes';
import { createActivity, createTask } from '@/lib/actions/gantt';
import { createIndicador } from '@/lib/actions/indicadores';
import { createItemPresupuesto } from '@/lib/actions/presupuesto';
import {
  parseImportFile,
  validateActividadesRows,
  validateIndicadorRow,
  validateParticipanteRow,
  validatePresupuestoRow,
  validateProyectoRow,
  buildNameMap,
  normKey,
  DT_LEGACY_COLUMNS,
  type ActividadImportRow,
  type CatalogMaps,
  type DtHeaderTarget,
  type ImportTemplateTipo,
  type IndicadorImportRow,
  type ParticipanteImportRow,
  type PresupuestoImportRow,
  type PreviewRowResult,
  type ProyectoImportRow,
} from '@/lib/excel-import';
import type { ProyectoFormPayload } from '@/types/proyecto';
import type { PermissionKey } from '@/lib/permissions/catalog';

function decodeBase64(base64: string): Buffer {
  const cleaned = base64.includes(',')
    ? base64.slice(base64.indexOf(',') + 1)
    : base64;
  return Buffer.from(cleaned, 'base64');
}

async function requireSession() {
  const session = await getSession();
  const user = session?.user as {
    id?: string;
    email?: string;
    name?: string;
    availableRoles?: string[];
  } | null;
  if (!user?.id) {
    return { error: 'No autenticado' as const, user: null };
  }
  return { error: null, user };
}

async function loadCatalogMaps(): Promise<CatalogMaps> {
  const [
    sedes,
    escuelas,
    carreras,
    asignaturas,
    comunas,
    gruposInteres,
    sociosComunitarios,
    fondos,
    lineas,
  ] = await Promise.all([
    prisma.sede.findMany(),
    prisma.escuela.findMany(),
    prisma.carrera.findMany(),
    prisma.asignatura.findMany(),
    prisma.comuna.findMany(),
    prisma.grupoInteres.findMany(),
    prisma.socioComunitario.findMany(),
    prisma.fondo.findMany(),
    prisma.linea.findMany({ include: { fondo: { select: { nombre: true } } } }),
  ]);

  const lineasByName = new Map<
    string,
    { id: string; nombre: string; fondoId: string; fondoNombre: string }[]
  >();
  for (const l of lineas) {
    const key = normKey(l.nombre);
    const arr = lineasByName.get(key) ?? [];
    arr.push({
      id: l.id,
      nombre: l.nombre,
      fondoId: l.fondoId,
      fondoNombre: l.fondo.nombre,
    });
    lineasByName.set(key, arr);
  }

  return {
    sedesByName: buildNameMap(sedes),
    escuelasByName: buildNameMap(escuelas),
    carrerasByName: buildNameMap(carreras),
    asignaturasByName: buildNameMap(asignaturas),
    comunasByName: buildNameMap(comunas),
    gruposByName: buildNameMap(gruposInteres),
    sociosByName: buildNameMap(sociosComunitarios),
    fondosByName: buildNameMap(fondos),
    lineasByName,
  };
}

async function loadDtHeaderMap(): Promise<Map<string, DtHeaderTarget>> {
  const subs = await prisma.desarrolloTecnicoSubcategoria.findMany({
    select: { id: true, nombre: true, campoKey: true },
    orderBy: { orden: 'asc' },
  });
  const map = new Map<string, DtHeaderTarget>();

  for (const s of subs) {
    const target: DtHeaderTarget = {
      subcategoriaId: s.id,
      campoKey: s.campoKey ?? null,
    };
    map.set(normKey(s.nombre), target);
    // Compat plantillas antiguas con prefijo DT:
    map.set(normKey(`DT:${s.nombre}`), target);
    map.set(normKey(`DT — ${s.nombre}`), target);
  }

  // Compat: headers legacy hardcodeados (ej. "Ejes de Impacto")
  for (const legacy of DT_LEGACY_COLUMNS) {
    const key = normKey(legacy.header);
    if (map.has(key)) continue;
    const sub = subs.find((s) => s.campoKey === legacy.key);
    if (sub) {
      map.set(key, {
        subcategoriaId: sub.id,
        campoKey: sub.campoKey ?? legacy.key,
      });
    }
  }

  return map;
}

const TAB_PERM: Record<
  Exclude<ImportTemplateTipo, 'proyectos'>,
  PermissionKey
> = {
  participantes: 'projects.import_participantes',
  actividades: 'projects.import_actividades',
  indicadores: 'projects.import_indicadores',
  presupuesto: 'projects.import_presupuesto',
};

async function assertTabImport(
  tipo: Exclude<ImportTemplateTipo, 'proyectos'>,
  proyectoId: string
) {
  const { error, user } = await requireSession();
  if (error || !user) return { ok: false as const, error: error ?? 'No autenticado' };
  const allowed = await userCanOnProject({
    availableRoles: user.availableRoles ?? [],
    email: user.email,
    userId: user.id,
    proyectoId,
    key: TAB_PERM[tipo],
  });
  if (!allowed) {
    return { ok: false as const, error: 'No tienes permiso para esta importación' };
  }
  return { ok: true as const, user };
}

export async function previewBulkProyectos(fileBase64: string): Promise<{
  success: boolean;
  rows?: PreviewRowResult<ProyectoImportRow>[];
  error?: string;
}> {
  try {
    const { error, user } = await requireSession();
    if (error || !user) return { success: false, error: error ?? 'No autenticado' };
    const can = await userHasPermission(
      user.availableRoles ?? [],
      'projects.bulk_create'
    );
    if (!can) return { success: false, error: 'No tienes permiso para crear proyectos masivos' };

    const buffer = decodeBase64(fileBase64);
    const parsed = await parseImportFile('proyectos', buffer);
    if (parsed.error) return { success: false, error: parsed.error };

    const [catalogs, dtByHeader, existing] = await Promise.all([
      loadCatalogMaps(),
      loadDtHeaderMap(),
      prisma.proyecto.findMany({ select: { proyecto: true } }),
    ]);
    const existingNames = new Set(existing.map((p) => normKey(p.proyecto)));
    const namesInFile = new Set<string>();

    const rows = parsed.rows.map((row) =>
      validateProyectoRow(row, catalogs, existingNames, namesInFile, dtByHeader)
    );
    return { success: true, rows };
  } catch (e) {
    console.error('previewBulkProyectos', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error en vista previa',
    };
  }
}

export async function confirmBulkProyectos(
  items: ProyectoImportRow[]
): Promise<{
  success: boolean;
  created?: number;
  errors?: { index: number; error: string }[];
  error?: string;
}> {
  try {
    const { error, user } = await requireSession();
    if (error || !user) return { success: false, error: error ?? 'No autenticado' };
    const can = await userHasPermission(
      user.availableRoles ?? [],
      'projects.bulk_create'
    );
    if (!can) return { success: false, error: 'No tienes permiso para crear proyectos masivos' };
    if (!items.length) return { success: false, error: 'No hay filas para importar' };

    // Re-check duplicates against DB
    const names = items.map((i) => i.nombre);
    const existing = await prisma.proyecto.findMany({
      where: {
        OR: names.map((n) => ({
          proyecto: { equals: n, mode: 'insensitive' as const },
        })),
      },
      select: { proyecto: true },
    });
    const existingSet = new Set(existing.map((p) => normKey(p.proyecto)));

    let created = 0;
    const errors: { index: number; error: string }[] = [];
    /** Cache nombre→id de socios creados/encontrados en este lote */
    const socioIdCache = new Map<string, string>();
    /** Cache nombre→id de asignaturas creadas/encontradas en este lote */
    const asignaturaIdCache = new Map<string, string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (existingSet.has(normKey(item.nombre))) {
        errors.push({
          index: i,
          error: `Ya existe un proyecto con el nombre "${item.nombre}"`,
        });
        continue;
      }

      const participantes_rel: ProyectoFormPayload['participantes_rel'] = [];

      // Asignaturas: match por nombre o crear si no existe
      const asignaturasIds: string[] = [];
      const seenAsigKeys = new Set<string>();
      for (const rawName of item.asignaturasNombres ?? []) {
        const name = rawName.trim();
        if (!name) continue;
        const key = normKey(name);
        if (seenAsigKeys.has(key)) continue;
        seenAsigKeys.add(key);

        let asignaturaId = asignaturaIdCache.get(key);
        if (!asignaturaId) {
          let asig = await prisma.asignatura.findFirst({
            where: { nombre: { equals: name, mode: 'insensitive' } },
            select: { id: true },
          });
          if (!asig) {
            asig = await prisma.asignatura.create({
              data: { nombre: name },
              select: { id: true },
            });
          }
          asignaturaId = asig.id;
          asignaturaIdCache.set(key, asignaturaId);
        }
        asignaturasIds.push(asignaturaId);
      }

      // Socios: match por nombre (case-insensitive) o crear si no existe
      const sociosComunitariosIds: string[] = [];
      const seenSocioKeys = new Set<string>();
      for (const rawName of item.sociosComunitariosNombres ?? []) {
        const name = rawName.trim();
        if (!name) continue;
        const key = normKey(name);
        if (seenSocioKeys.has(key)) continue;
        seenSocioKeys.add(key);

        let socioId = socioIdCache.get(key);
        if (!socioId) {
          let socio = await prisma.socioComunitario.findFirst({
            where: { nombre: { equals: name, mode: 'insensitive' } },
            select: { id: true },
          });
          if (!socio) {
            socio = await prisma.socioComunitario.create({
              data: { nombre: name },
              select: { id: true },
            });
          }
          socioId = socio.id;
          socioIdCache.set(key, socioId);
        }
        sociosComunitariosIds.push(socioId);
      }

      const result = await createProyecto({
        proyecto: item.nombre,
        fondo: item.fondo ?? '',
        linea: item.linea,
        sede: item.sedeNombres.join(', '),
        sedesIds: item.sedesIds,
        youtubeUrl: item.youtubeUrl,
        focalizacion: item.focalizacion,
        objetivoGeneral: item.objetivoGeneral,
        objetivosEspecificos: item.objetivosEspecificos,
        avanceGantt: 0,
        objetivos: 0,
        presupuestoUsado: 0,
        presupuestoTotal: 0,
        participantes: participantes_rel.length,
        escuelasIds: item.escuelasIds,
        carrerasIds: item.carrerasIds,
        asignaturasIds,
        comunasIds: item.comunasIds,
        gruposInteresIds: item.gruposInteresIds,
        sociosComunitariosIds,
        participantes_rel,
      });

      if (!result.success || !result.data) {
        errors.push({
          index: i,
          error: result.error ?? 'Error al crear proyecto',
        });
        continue;
      }

      const proyectoId = result.data.id;
      existingSet.add(normKey(item.nombre));

      const hasDt =
        Object.keys(item.desarrolloTecnico).length > 0 ||
        item.desarrolloTecnicoValores.length > 0;
      if (hasDt) {
        await updateProyectoGeneralTab({
          proyectoId,
          desarrolloTecnico: item.desarrolloTecnico,
          desarrolloTecnicoValores: item.desarrolloTecnicoValores,
        });
      }

      created += 1;
    }

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');

    return {
      success: errors.length === 0,
      created,
      errors: errors.length ? errors : undefined,
      error:
        errors.length && created === 0
          ? 'No se pudo crear ningún proyecto'
          : undefined,
    };
  } catch (e) {
    console.error('confirmBulkProyectos', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al confirmar importación',
    };
  }
}

export async function previewImportParticipantes(
  proyectoId: string,
  fileBase64: string
): Promise<{
  success: boolean;
  rows?: PreviewRowResult<ParticipanteImportRow>[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('participantes', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = decodeBase64(fileBase64);
    const parsed = await parseImportFile('participantes', buffer);
    if (parsed.error) return { success: false, error: parsed.error };

    const catalogs = await loadCatalogMaps();
    const socios = await prisma.proyectoSocioComunitario.findMany({
      where: { proyectoId },
      select: { socioComunitarioId: true },
    });
    const sociosDelProyecto = new Set(socios.map((s) => s.socioComunitarioId));

    const rows = parsed.rows.map((row) =>
      validateParticipanteRow(row, catalogs, sociosDelProyecto)
    );
    return { success: true, rows };
  } catch (e) {
    console.error('previewImportParticipantes', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error en vista previa',
    };
  }
}

export async function confirmImportParticipantes(
  proyectoId: string,
  items: ParticipanteImportRow[]
): Promise<{
  success: boolean;
  created?: number;
  errors?: { index: number; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('participantes', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!items.length) return { success: false, error: 'No hay filas' };

    let created = 0;
    const errors: { index: number; error: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await addParticipanteProyecto(proyectoId, {
        rol: item.rol,
        nombre: item.nombre,
        email: item.email,
        rut: item.rut ?? undefined,
        cargo: item.cargo ?? undefined,
        laborEnProyecto: item.laborEnProyecto ?? undefined,
        socioComunitarioId: item.socioComunitarioId ?? undefined,
        sedeId: item.sedeId ?? undefined,
        escuelaId: item.escuelaId ?? undefined,
        carreraId: item.carreraId ?? undefined,
        asignaturaId: item.asignaturaId ?? undefined,
      });
      if (!result.success) {
        errors.push({ index: i, error: result.error ?? 'Error' });
      } else {
        created += 1;
      }
    }
    return {
      success: errors.length === 0,
      created,
      errors: errors.length ? errors : undefined,
    };
  } catch (e) {
    console.error('confirmImportParticipantes', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al importar',
    };
  }
}

export async function previewImportActividades(
  proyectoId: string,
  fileBase64: string
): Promise<{
  success: boolean;
  rows?: PreviewRowResult<ActividadImportRow>[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('actividades', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = decodeBase64(fileBase64);
    const parsed = await parseImportFile('actividades', buffer);
    if (parsed.error) return { success: false, error: parsed.error };

    // Reject if activity name already exists in project
    const existing = await prisma.activity.findMany({
      where: { projectId: proyectoId },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((a) => normKey(a.name)));

    const rows = validateActividadesRows(parsed.rows).map((r) => {
      if (r.status === 'ok' && r.data?.tipo === 'Actividad') {
        if (existingNames.has(normKey(r.data.nombre))) {
          return {
            ...r,
            status: 'error' as const,
            errors: [
              ...r.errors,
              `Ya existe una actividad "${r.data.nombre}" en el proyecto (solo se agregan nuevas)`,
            ],
            data: undefined,
          };
        }
      }
      return r;
    });

    return { success: true, rows };
  } catch (e) {
    console.error('previewImportActividades', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error en vista previa',
    };
  }
}

export async function confirmImportActividades(
  proyectoId: string,
  items: ActividadImportRow[]
): Promise<{
  success: boolean;
  created?: number;
  errors?: { index: number; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('actividades', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!items.length) return { success: false, error: 'No hay filas' };

    const activities = items.filter(
      (i): i is Extract<ActividadImportRow, { tipo: 'Actividad' }> =>
        i.tipo === 'Actividad'
    );
    const tasks = items.filter(
      (i): i is Extract<ActividadImportRow, { tipo: 'Tarea' }> =>
        i.tipo === 'Tarea'
    );

    const idByName = new Map<string, string>();
    let created = 0;
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      const result = await createActivity({
        projectId: proyectoId,
        name: act.nombre,
        description: act.descripcion,
        color: 'bg-gray-700',
        orderIndex: act.orden,
        progress: 0,
        kanbanOrderIndex: act.orden,
        status: 'TODO',
      });
      if (!result.success || !result.data) {
        errors.push({
          index: i,
          error: result.error ?? `Error creando actividad "${act.nombre}"`,
        });
      } else {
        idByName.set(normKey(act.nombre), result.data.id);
        created += 1;
      }
    }

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const activityId = idByName.get(normKey(t.actividadPadre));
      if (!activityId) {
        errors.push({
          index: activities.length + i,
          error: `No se encontró actividad padre "${t.actividadPadre}"`,
        });
        continue;
      }
      const result = await createTask({
        activityId,
        name: t.nombre,
        description: t.descripcion,
        startDate: t.fechaInicio,
        endDate: t.fechaFin,
        progress: 0,
        completed: false,
      });
      if (!result.success) {
        errors.push({
          index: activities.length + i,
          error: result.error ?? `Error creando tarea "${t.nombre}"`,
        });
      } else {
        created += 1;
      }
    }

    revalidatePath('/proyectos');
    return {
      success: errors.length === 0,
      created,
      errors: errors.length ? errors : undefined,
    };
  } catch (e) {
    console.error('confirmImportActividades', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al importar',
    };
  }
}

export async function previewImportIndicadores(
  proyectoId: string,
  fileBase64: string
): Promise<{
  success: boolean;
  rows?: PreviewRowResult<IndicadorImportRow>[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('indicadores', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = decodeBase64(fileBase64);
    const parsed = await parseImportFile('indicadores', buffer);
    if (parsed.error) return { success: false, error: parsed.error };

    const rows = parsed.rows.map((row) => validateIndicadorRow(row));
    return { success: true, rows };
  } catch (e) {
    console.error('previewImportIndicadores', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error en vista previa',
    };
  }
}

export async function confirmImportIndicadores(
  proyectoId: string,
  items: IndicadorImportRow[]
): Promise<{
  success: boolean;
  created?: number;
  errors?: { index: number; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('indicadores', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!items.length) return { success: false, error: 'No hay filas' };

    const existingOe = await prisma.objetivoProyecto.findMany({
      where: { proyectoId, tipo: 'Especifico' },
      select: { id: true, descripcion: true, orden: true },
      orderBy: { orden: 'asc' },
    });
    const oeByDesc = new Map(
      existingOe.map((o) => [normKey(o.descripcion), o.id])
    );
    let nextOrden =
      existingOe.length > 0
        ? Math.max(...existingOe.map((o) => o.orden)) + 1
        : 1;

    let created = 0;
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let oeId = oeByDesc.get(normKey(item.objetivoEspecifico));
      if (!oeId) {
        const createdOe = await prisma.objetivoProyecto.create({
          data: {
            proyectoId,
            tipo: 'Especifico',
            descripcion: item.objetivoEspecifico.trim(),
            orden: nextOrden++,
          },
        });
        oeId = createdOe.id;
        oeByDesc.set(normKey(item.objetivoEspecifico), oeId);
      }

      const result = await createIndicador(proyectoId, oeId, {
        nombre: item.nombre,
        descripcion: item.descripcion,
        formaCalculo: item.formaCalculo,
        resultadoEsperado: item.resultadoEsperado,
        formatoNumero: item.formatoNumero,
        fechaInicio: item.fechaInicio,
        fechaFin: item.fechaFin,
      });
      if (!result.success) {
        errors.push({ index: i, error: result.error ?? 'Error' });
      } else {
        created += 1;
      }
    }

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    return {
      success: errors.length === 0,
      created,
      errors: errors.length ? errors : undefined,
    };
  } catch (e) {
    console.error('confirmImportIndicadores', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al importar',
    };
  }
}

export async function previewImportPresupuesto(
  proyectoId: string,
  fileBase64: string
): Promise<{
  success: boolean;
  rows?: PreviewRowResult<PresupuestoImportRow>[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('presupuesto', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };

    const buffer = decodeBase64(fileBase64);
    const parsed = await parseImportFile('presupuesto', buffer);
    if (parsed.error) return { success: false, error: parsed.error };

    const rows = parsed.rows.map((row) => validatePresupuestoRow(row));
    return { success: true, rows };
  } catch (e) {
    console.error('previewImportPresupuesto', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error en vista previa',
    };
  }
}

export async function confirmImportPresupuesto(
  proyectoId: string,
  items: PresupuestoImportRow[]
): Promise<{
  success: boolean;
  created?: number;
  errors?: { index: number; error: string }[];
  error?: string;
}> {
  try {
    const auth = await assertTabImport('presupuesto', proyectoId);
    if (!auth.ok) return { success: false, error: auth.error };
    if (!items.length) return { success: false, error: 'No hay filas' };

    let created = 0;
    const errors: { index: number; error: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await createItemPresupuesto(proyectoId, {
        cuenta: item.cuenta,
        item: item.item,
        detalle: item.detalle,
        monto: item.monto,
      });
      if (!result.success) {
        errors.push({ index: i, error: result.error ?? 'Error' });
      } else {
        created += 1;
      }
    }
    return {
      success: errors.length === 0,
      created,
      errors: errors.length ? errors : undefined,
    };
  } catch (e) {
    console.error('confirmImportPresupuesto', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Error al importar',
    };
  }
}
