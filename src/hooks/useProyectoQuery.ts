'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProyectoBase,
  getProyectoParticipantes,
} from '@/lib/actions/proyectos';
import { getActivities } from '@/lib/actions/gantt';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
  proyectoParticipantesKey,
} from '@/lib/query-keys';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { ActivityWithTasks } from '@/lib/actions/gantt';

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

export function useProyectoParticipantesQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId
      ? proyectoParticipantesKey(projectId)
      : ['proyecto', 'none', 'participantes'],
    queryFn: () => fetchProyectoParticipantes(projectId!),
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
  return useCallback(
    (projectId: string) => {
      void queryClient.prefetchQuery({
        queryKey: proyectoBaseKey(projectId),
        queryFn: () => fetchProyectoBase(projectId),
        staleTime: 60_000,
      });
    },
    [queryClient]
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
      });
    },
    [queryClient]
  );
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
}
