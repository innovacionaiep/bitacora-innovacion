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
  reunionesKey,
  historialKey,
  historialFiltrosKey,
  escalamientoKey,
} from '@/lib/query-keys';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { isProyectoGeneralShell } from '@/lib/proyecto-detail-cache';
import type { ActivityWithTasks } from '@/lib/actions/gantt';
import type { ItemPresupuestoItem } from '@/types/presupuesto';
import type { IndicadoresProyectoData } from '@/lib/actions/indicadores';
import { getReunionesProyecto } from '@/lib/actions/seguimiento';
import {
  getHistorialProyecto,
  getHistorialFiltros,
} from '@/lib/actions/historial';
import { getEscalamientoProyecto } from '@/lib/actions/escalamiento';
import { runInBursts } from '@/lib/idle-burst';

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

async function fetchReunionesTab(projectId: string) {
  const result = await getReunionesProyecto(projectId);
  if (!result.success) {
    throw new Error(result.error ?? 'Error al cargar reuniones');
  }
  return result.data ?? [];
}

async function fetchHistorialTab(projectId: string) {
  const result = await getHistorialProyecto(projectId);
  if (!result.success) {
    throw new Error(result.error ?? 'Error al cargar historial');
  }
  return result.data ?? [];
}

async function fetchHistorialFiltrosTab(projectId: string) {
  const result = await getHistorialFiltros(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar filtros de historial');
  }
  return result.data;
}

async function fetchEscalamientoTab(projectId: string) {
  const result = await getEscalamientoProyecto(projectId);
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar escalamiento');
  }
  return result.data;
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
  const next: ProyectoWithRelations & { __generalShell?: boolean } = {
    ...project,
    desarrolloTecnico: dt.desarrolloTecnico,
    desarrolloTecnicoValores: dt.desarrolloTecnicoValores,
  };
  delete next.__generalShell;
  return next;
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

export const IDLE_TAB_PREFETCH_CONCURRENCY = 2;

export type PrefetchableProyectoTab =
  | 'Gantt'
  | 'Indicadores'
  | 'Presupuesto'
  | 'Participantes'
  | 'Seguimiento'
  | 'Historial'
  | 'Escalamiento';

const TAB_CHUNK_LOADERS: Partial<
  Record<PrefetchableProyectoTab, () => Promise<unknown>>
> = {
  Gantt: () => import('@/components/proyectos/GanttChart'),
  Indicadores: () => import('@/components/proyectos/IndicadoresCard'),
  Presupuesto: () => import('@/components/proyectos/PresupuestoCard'),
  Seguimiento: () => import('@/components/seguimiento/SeguimientoCard'),
  Historial: () => import('@/components/proyectos/HistorialCard'),
};

export const ALL_PREFETCH_TABS: PrefetchableProyectoTab[] = [
  'Gantt',
  'Indicadores',
  'Presupuesto',
  'Participantes',
  'Seguimiento',
  'Historial',
  'Escalamiento',
];

export function isPrefetchableProyectoTab(
  tab: string
): tab is PrefetchableProyectoTab {
  return (ALL_PREFETCH_TABS as string[]).includes(tab);
}

type TabQuerySpec = {
  key: (id: string) => readonly unknown[];
  queryFn: (id: string) => Promise<unknown>;
};

const TAB_QUERIES: Record<PrefetchableProyectoTab, TabQuerySpec[]> = {
  Gantt: [{ key: proyectoActivitiesKey, queryFn: fetchProyectoActivities }],
  Indicadores: [{ key: indicadoresKey, queryFn: fetchIndicadoresTab }],
  Presupuesto: [{ key: presupuestoKey, queryFn: fetchPresupuestoTab }],
  Participantes: [
    { key: proyectoParticipantesKey, queryFn: fetchProyectoParticipantes },
  ],
  Seguimiento: [{ key: reunionesKey, queryFn: fetchReunionesTab }],
  Historial: [
    { key: (id) => historialKey(id, {}), queryFn: fetchHistorialTab },
    { key: historialFiltrosKey, queryFn: fetchHistorialFiltrosTab },
  ],
  Escalamiento: [{ key: escalamientoKey, queryFn: fetchEscalamientoTab }],
};

function prefetchTabChunk(tab: PrefetchableProyectoTab) {
  const load = TAB_CHUNK_LOADERS[tab];
  if (!load) return;
  void load().catch(() => {
    /* ignore chunk prefetch errors */
  });
}

/**
 * After General is ready: JS chunks + tab data on idle.
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
    async (projectId: string, tab: PrefetchableProyectoTab, gen: number) => {
      if (gen !== genRef.current) return;
      const pending: Promise<unknown>[] = [];
      for (const { key, queryFn } of TAB_QUERIES[tab]) {
        const queryKey = key(projectId);
        if (queryClient.getQueryData(queryKey)) continue;
        pending.push(
          queryClient
            .prefetchQuery({
              queryKey: [...queryKey],
              queryFn: () => queryFn(projectId),
              staleTime: 60_000,
              gcTime: 90_000,
            })
            .catch(() => {
              /* ignore prefetch errors */
            })
        );
      }
      if (pending.length > 0) await Promise.all(pending);
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
      const runIdle = () => {
        if (gen !== genRef.current) return;
        void runInBursts(
          ALL_PREFETCH_TABS,
          IDLE_TAB_PREFETCH_CONCURRENCY,
          async (tab) => {
            if (gen !== genRef.current) return;
            prefetchTabChunk(tab);
            await prefetchTabData(projectId, tab, gen);
          },
          () => gen !== genRef.current
        );
      };
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleCallbackRef.current = window.requestIdleCallback(runIdle, {
          timeout: 2000,
        });
      } else {
        idleTimeoutRef.current = setTimeout(runIdle, 300);
      }
    },
    [clearIdle, prefetchTabData]
  );

  const prefetchTab = useCallback(
    (projectId: string, tab: PrefetchableProyectoTab) => {
      prefetchTabChunk(tab);
      void prefetchTabData(projectId, tab, genRef.current);
    },
    [prefetchTabData]
  );

  return { startIdlePrefetch, cancel, prefetchTab };
}

export function setProyectoBaseCache(
  queryClient: ReturnType<typeof useQueryClient>,
  project: ProyectoWithRelations
) {
  if (isProyectoGeneralShell(project)) return;
  queryClient.setQueryData(proyectoBaseKey(project.id), project);
  if (project.participantes_rel) {
    queryClient.setQueryData(
      proyectoParticipantesKey(project.id),
      project.participantes_rel
    );
  }
  if (!('desarrolloTecnico' in project)) return;
  queryClient.setQueryData(proyectoDesarrolloTecnicoKey(project.id), {
    desarrolloTecnico: project.desarrolloTecnico ?? null,
    desarrolloTecnicoValores: project.desarrolloTecnicoValores ?? [],
  });
}
