/** Política de carga del detalle de proyecto (General) y LRU de caches RQ. */

import type { ProyectoListadoItem, ProyectoWithRelations } from '@/types/proyecto';

export const GET_PROYECTO_BASE_OPTIONS = {
  includeActivities: false,
  includeParticipantes: false,
  // DT va en paralelo (getProyectoDesarrolloTecnico) para pintar OG/video antes.
  includeDesarrolloTecnico: false,
} as const;

/** Escalares de Proyecto que el detalle General/Convenio necesita (sin relaciones). */
export const GET_PROYECTO_SCALAR_SELECT = {
  id: true,
  proyecto: true,
  fondo: true,
  linea: true,
  sede: true,
  youtubeUrl: true,
  focalizacion: true,
  avanceGantt: true,
  objetivos: true,
  presupuestoUsado: true,
  presupuestoTotal: true,
  presupuestoAdjudicado: true,
  participantes: true,
  convenioFirmadoUrl: true,
  convenioFirmadoPublicId: true,
  convenioFirmadoNombre: true,
  convenioFirmadoAt: true,
  convenioFirmadoByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Encabezado instantáneo desde el listado. Sin clave `desarrolloTecnico`
 * para no cachearlo como detalle completo ni disparar un segundo viaje de DT.
 */
export function shellProyectoFromListado(
  item: ProyectoListadoItem
): ProyectoWithRelations {
  const epoch = new Date(0);
  const shell = {
    id: item.id,
    proyecto: item.proyecto,
    fondo: item.fondo ?? '',
    linea: null,
    sede: item.sede,
    youtubeUrl: null,
    focalizacion: null,
    avanceGantt: 0,
    objetivos: 0,
    presupuestoUsado: 0,
    presupuestoTotal: 0,
    presupuestoAdjudicado: 0,
    participantes: 0,
    convenioFirmadoUrl: null,
    convenioFirmadoPublicId: null,
    convenioFirmadoNombre: null,
    convenioFirmadoAt: null,
    convenioFirmadoByUserId: null,
    createdAt: epoch,
    updatedAt: epoch,
    escuelas: (item.escuelas ?? []).map((e, i) => ({
      proyectoId: item.id,
      escuelaId: `shell-${item.id}-${i}`,
      escuela: {
        id: `shell-${item.id}-${i}`,
        nombre: e.escuela.nombre,
        codigo: '',
      },
    })),
    carreras: [],
    asignaturas: [],
    comunas: [],
    gruposInteres: [],
    sociosComunitarios: [],
    objetivos_rel: [],
    __generalShell: true,
  };
  return shell as ProyectoWithRelations;
}

export function isProyectoGeneralShell(
  project: ProyectoWithRelations
): boolean {
  return (project as { __generalShell?: boolean }).__generalShell === true;
}

/** Select de lista Gantt: sin _count.evidencias (el modal las carga aparte). */
export const GET_ACTIVITIES_LIST_SELECT = {
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
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export const GET_ACTIVITIES_INCLUDE_EVIDENCIAS_COUNT = false;

export const PROYECTO_DETAIL_LRU_KEEP = 5;

/**
 * Move `projectId` to the front of the recent list and return ids to evict.
 * Does not mutate the input array.
 */
export function touchProyectoDetailLru(
  recentIds: readonly string[],
  projectId: string,
  keep: number = PROYECTO_DETAIL_LRU_KEEP
): { recent: string[]; evict: string[] } {
  const recent = recentIds.filter((id) => id !== projectId);
  recent.unshift(projectId);
  const evict = recent.splice(keep);
  return { recent, evict };
}
