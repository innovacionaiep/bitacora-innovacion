'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProyecto } from '@/lib/actions/proyectos';
import { getActivities } from '@/lib/actions/gantt';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
} from '@/lib/query-keys';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { ActivityWithTasks } from '@/lib/actions/gantt';

async function fetchProyectoBase(projectId: string): Promise<ProyectoWithRelations> {
  const result = await getProyecto(projectId, { includeActivities: false });
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Error al cargar proyecto');
  }
  return result.data as ProyectoWithRelations;
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

export function useProyectoQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? proyectoBaseKey(projectId) : ['proyecto', 'none'],
    queryFn: () => fetchProyectoBase(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
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
  });
}

export function usePrefetchProyecto() {
  const queryClient = useQueryClient();
  return (projectId: string) => {
    void queryClient.prefetchQuery({
      queryKey: proyectoBaseKey(projectId),
      queryFn: () => fetchProyectoBase(projectId),
      staleTime: 60_000,
    });
  };
}

export function useFetchProyectoBase() {
  const queryClient = useQueryClient();
  return async (projectId: string): Promise<ProyectoWithRelations> => {
    return queryClient.fetchQuery({
      queryKey: proyectoBaseKey(projectId),
      queryFn: () => fetchProyectoBase(projectId),
      staleTime: 60_000,
    });
  };
}

export function useFetchProyectoActivities() {
  const queryClient = useQueryClient();
  return async (projectId: string): Promise<ActivityWithTasks[]> => {
    return queryClient.fetchQuery({
      queryKey: proyectoActivitiesKey(projectId),
      queryFn: () => fetchProyectoActivities(projectId),
      staleTime: 60_000,
    });
  };
}

export function setProyectoBaseCache(
  queryClient: ReturnType<typeof useQueryClient>,
  project: ProyectoWithRelations
) {
  queryClient.setQueryData(proyectoBaseKey(project.id), project);
}
