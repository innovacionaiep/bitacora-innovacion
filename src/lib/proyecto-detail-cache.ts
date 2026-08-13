/** Política de carga del detalle de proyecto (General) y LRU de caches RQ. */

export const GET_PROYECTO_BASE_OPTIONS = {
  includeActivities: false,
  includeParticipantes: false,
  includeDesarrolloTecnico: true,
} as const;

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
