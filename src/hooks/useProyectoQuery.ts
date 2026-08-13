'use client';

import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getProyectoBase,
  getProyectoParticipantes,
  getProyectoDesarrolloTecnico,
} from '@/lib/actions/proyectos';
import { getActivities } from '@/lib/actions/gantt';
import { getIndicadoresByProyecto } from '@/lib/actions/indicadores';
import { getPresupuestoByProyecto } from '@/lib/actions/presupuesto';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
  proyectoParticipantesKey,
  proyectoDesarrolloTecnicoKey,
  proyectoDetailQueryFilters,
  indicadoresKey,
  presupuestoKey,
} from '@/lib/query-keys';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { ActivityWithTasks } from '@/lib/actions/gantt';
import type { ItemPresupuestoItem } from '@/types/presupuesto';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';

export type ProyectoDesarrolloTecnicoData = NonNullable<
  Awaited<ReturnType<typeof getProyectoDesarrolloTecnico>>['data']
>;

const PREFETCH_DEBOUNCE_MS = 200;
const PREFETCH_MAX_CONCURRENT = 2;

async function fetchProyectoBase(
  projectId: string
): Promise<ProyectoWithRelations> {
  const result = await getProyectoBase(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar proyecto');
  }
  return result.data as ProyectoWithRelations;
}

async function fetchProyectoParticipantes(projectId: string) {
  const result = await getProyectoParticipantes(projectId);
  if (!result.success) {
    throw new Error(result.error ?? 'Error al cargar participantes');
  }
  return result.data ?? [];
}

async function fetchProyectoDesarrolloTecnico(
  projectId: string
): Promise<ProyectoDesarrolloTecnicoData> {
  const result = await getProyectoDesarrolloTecnico(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar desarrollo técnico');
  }
  return result.data;
}

async function fetchProyectoActivities(
  projectId: string
): Promise<ActivityWithTasks[]> {
  const result = await getActivities(projectId);
  if (!result.success) {
    throw new Error(result.error ?? 'Error al cargar actividades');
  }
  return (result.data ?? []) as ActivityWithTasks[];
}

async function fetchIndicadoresTab(
  projectId: string
): Promise<IndicadoresProyectoData> {
  const result = await getIndicadoresByProyecto(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Error al cargar indicadores');
  }
  return result.data;
}

async function fetchPresupuestoTab(
  projectId: string
): Promise<ItemPresupuestoItem[]> {
  const result = await getPresupuestoByProyecto(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar presupuesto');
  }
  return result.data.items as ItemPresupuestoItem[];
}

export function proyectoNeedsDesarrolloTecnicoFetch(
  project: ProyectoWithRelations
): boolean {
  return !('desarrolloTecnico' in project);
}

export function mergeDesarrolloTecnicoIntoProject(
  project: ProyectoWithRelations,
  dt: ProyectoDesarrolloTecnicoData
): ProyectoWithRelations {
  return {
    ...project,
    desarrolloTecnico: dt.desarrolloTecnico,
    desarrolloTecnicoValores: dt.desarrolloTecnicoValores,
  };
}

/** Drop all React Query entries for one project (base, tabs, historial…). */
export function removeProyectoDetailQueries(
  queryClient: QueryClient,
  projectId: string
) {
  for (const filter of proyectoDetailQueryFilters(projectId)) {
    queryClient.removeQueries({ queryKey: [...filter.queryKey] });
  }
}

export function useProyectoQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? proyectoBaseKey(projectId) : ['proyecto', 'none'],
    queryFn: () => fetchProyectoBase(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    gcTime: 90_000,
  });
}

export function useProyectoDesarrolloTecnicoQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId
      ? proyectoDesarrolloTecnicoKey(projectId)
      : ['proyecto', 'none', 'desarrollo-tecnico'],
    queryFn: () => fetchProyectoDesarrolloTecnico(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    gcTime: 90_000,
  });
}

export function useProyectoParticipantesQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId
      ? proyectoParticipantesKey(projectId)
      : ['proyecto', 'none', 'participantes'],
    queryFn: () => fetchProyectoParticipantes(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    gcTime: 90_000,
  });
}

export function useProyectoActivitiesQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId
      ? proyectoActivitiesKey(projectId)
      : ['proyecto-activities', 'none'],
    queryFn: () => fetchProyectoActivities(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
    gcTime: 90_000,
  });
}

/**
 * Prefetch project base on hover: debounce + max 2 concurrent to avoid
 * flooding the network when sweeping the list.
 */
export function usePrefetchProyecto() {
  const queryClient = useQueryClient();
  const inflightRef = useRef(new Set<string>());
  const queueRef = useRef<string[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const pump = useCallback(() => {
    while (
      inflightRef.current.size < PREFETCH_MAX_CONCURRENT &&
      queueRef.current.length > 0
    ) {
      const projectId = queueRef.current.shift()!;
      if (inflightRef.current.has(projectId)) continue;
      if (queryClient.getQueryData(proyectoBaseKey(projectId))) continue;

      inflightRef.current.add(projectId);
      void queryClient
        .prefetchQuery({
          queryKey: proyectoBaseKey(projectId),
          queryFn: () => fetchProyectoBase(projectId),
          staleTime: 60_000,
          gcTime: 90_000,
        })
        .catch(() => {
          /* ignore prefetch errors */
        })
        .finally(() => {
          inflightRef.current.delete(projectId);
          pump();
        });
    }
  }, [queryClient]);

  return useCallback(
    (projectId: string) => {
      const prev = timersRef.current.get(projectId);
      if (prev) clearTimeout(prev);
      timersRef.current.set(
        projectId,
        setTimeout(() => {
          timersRef.current.delete(projectId);
          if (
            !queueRef.current.includes(projectId) &&
            !inflightRef.current.has(projectId) &&
            !queryClient.getQueryData(proyectoBaseKey(projectId))
          ) {
            queueRef.current.push(projectId);
          }
          pump();
        }, PREFETCH_DEBOUNCE_MS)
      );
    },
    [pump, queryClient]
  );
}

export function useFetchProyectoBase() {
  const queryClient = useQueryClient();
  return useCallback(
    async (projectId: string): Promise<ProyectoWithRelations> => {
      return queryClient.fetchQuery({
        queryKey: proyectoBaseKey(projectId),
        queryFn: () => fetchProyectoBase(projectId),
        staleTime: 60_000,
        gcTime: 90_000,
      });
    },
    [queryClient]
  );
}

export function useFetchProyectoDesarrolloTecnico() {
  const queryClient = useQueryClient();
  return useCallback(
    async (projectId: string): Promise<ProyectoDesarrolloTecnicoData> => {
      return queryClient.fetchQuery({
        queryKey: proyectoDesarrolloTecnicoKey(projectId),
        queryFn: () => fetchProyectoDesarrolloTecnico(projectId),
        staleTime: 60_000,
        gcTime: 90_000,
      });
    },
    [queryClient]
  );
}

export function useFetchProyectoParticipantes() {
  const queryClient = useQueryClient();
  return useCallback(
    async (projectId: string) => {
      return queryClient.fetchQuery({
        queryKey: proyectoParticipantesKey(projectId),
        queryFn: () => fetchProyectoParticipantes(projectId),
        staleTime: 60_000,
        gcTime: 90_000,
      });
    },
    [queryClient]
  );
}

export function useFetchProyectoActivities() {
  const queryClient = useQueryClient();
  return useCallback(
    async (projectId: string): Promise<ActivityWithTasks[]> => {
      return queryClient.fetchQuery({
        queryKey: proyectoActivitiesKey(projectId),
        queryFn: () => fetchProyectoActivities(projectId),
        staleTime: 60_000,
        gcTime: 90_000,
      });
    },
    [queryClient]
  );
}

export type PrefetchableProyectoTab = 'Gantt' | 'Indicadores' | 'Presupuesto';

const TAB_CHUNK_LOADERS: Record<
  PrefetchableProyectoTab,
  () => Promise<unknown>
> = {
  Gantt: () => import('@/components/proyectos/GanttChart'),
  Indicadores: () => import('@/components/proyectos/IndicadoresCard'),
  Presupuesto: () => import('@/components/proyectos/PresupuestoCard'),
};

const ALL_PREFETCH_TABS: PrefetchableProyectoTab[] = [
  'Gantt',
  'Indicadores',
  'Presupuesto',
];

const TAB_QUERY: Record<
  PrefetchableProyectoTab,
  {
    key: (id: string) => readonly unknown[];
    queryFn: (id: string) => Promise<unknown>;
  }
> = {
  Gantt: {
    key: proyectoActivitiesKey,
    queryFn: fetchProyectoActivities,
  },
  Indicadores: {
    key: indicadoresKey,
    queryFn: fetchIndicadoresTab,
  },
  Presupuesto: {
    key: presupuestoKey,
    queryFn: fetchPresupuestoTab,
  },
};

function prefetchTabChunk(tab: PrefetchableProyectoTab) {
  void TAB_CHUNK_LOADERS[tab]().catch(() => {
    /* ignore chunk prefetch errors */
  });
}

/**
 * After General paints: JS chunks immediately, tab data on idle.
 * Hover on a tab button prefetches that tab's chunk+data.
 * Cancel when leaving or switching project.
 */
export function usePrefetchProyectoTabs() {
  const queryClient = useQueryClient();
  const genRef = useRef(0);
  const idleCallbackRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdle = useCallback(() => {
    if (idleCallbackRef.current != null && typeof window !== 'undefined') {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallbackRef.current);
      }
      idleCallbackRef.current = null;
    }
    if (idleTimeoutRef.current != null) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const prefetchTabData = useCallback(
    (projectId: string, tab: PrefetchableProyectoTab, gen: number) => {
      if (gen !== genRef.current) return;
      const { key, queryFn } = TAB_QUERY[tab];
      const queryKey = key(projectId);
      if (queryClient.getQueryData(queryKey)) return;
      void queryClient
        .prefetchQuery({
          queryKey: [...queryKey],
          queryFn: () => queryFn(projectId),
          staleTime: 60_000,
          gcTime: 90_000,
        })
        .catch(() => {
          /* ignore prefetch errors */
        });
    },
    [queryClient]
  );

  const cancel = useCallback(() => {
    genRef.current += 1;
    clearIdle();
  }, [clearIdle]);

  const startIdlePrefetch = useCallback(
    (projectId: string) => {
      const gen = ++genRef.current;
      clearIdle();
      for (const tab of ALL_PREFETCH_TABS) {
        prefetchTabChunk(tab);
      }
      const runData = () => {
        if (gen !== genRef.current) return;
        for (const tab of ALL_PREFETCH_TABS) {
          prefetchTabData(projectId, tab, gen);
        }
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleCallbackRef.current = window.requestIdleCallback(runData, {
          timeout: 2000,
        });
      } else {
        idleTimeoutRef.current = setTimeout(runData, 300);
      }
    },
    [clearIdle, prefetchTabData]
  );

  const prefetchTab = useCallback(
    (projectId: string, tab: PrefetchableProyectoTab) => {
      prefetchTabChunk(tab);
      prefetchTabData(projectId, tab, genRef.current);
    },
    [prefetchTabData]
  );

  return { startIdlePrefetch, cancel, prefetchTab };
}

export function setProyectoBaseCache(
  queryClient: ReturnType<typeof useQueryClient>,
  project: ProyectoWithRelations
) {
  queryClient.setQueryData(proyectoBaseKey(project.id), project);
  if (project.participantes_rel) {
    queryClient.setQueryData(
      proyectoParticipantesKey(project.id),
      project.participantes_rel
    );
  }
  if ('desarrolloTecnico' in project) {
    queryClient.setQueryData(proyectoDesarrolloTecnicoKey(project.id), {
      desarrolloTecnico: project.desarrolloTecnico ?? null,
      desarrolloTecnicoValores: project.desarrolloTecnicoValores ?? [],
    });
  }
}
