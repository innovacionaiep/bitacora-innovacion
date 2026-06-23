'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProyecto, type GetProyectoOptions } from '@/lib/actions/proyectos';
import type { ProyectoWithRelations } from '@/types/proyecto';

export function proyectoQueryKey(
  id: string,
  options?: GetProyectoOptions
) {
  return ['proyecto', id, options?.includeActivities !== false] as const;
}

export function useProyectoQuery(
  projectId: string | null,
  options?: GetProyectoOptions
) {
  return useQuery({
    queryKey: projectId
      ? proyectoQueryKey(projectId, options)
      : ['proyecto', 'none'],
    queryFn: async () => {
      if (!projectId) return null;
      const result = await getProyecto(projectId, options);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Error al cargar proyecto');
      }
      return result.data as ProyectoWithRelations;
    },
    enabled: !!projectId,
  });
}

export function usePrefetchProyecto() {
  const queryClient = useQueryClient();
  return (projectId: string, options?: GetProyectoOptions) => {
    void queryClient.prefetchQuery({
      queryKey: proyectoQueryKey(projectId, options),
      queryFn: async () => {
        const result = await getProyecto(projectId, options);
        if (!result.success || !result.data) {
          throw new Error(result.error ?? 'Error al cargar proyecto');
        }
        return result.data as ProyectoWithRelations;
      },
      staleTime: 60_000,
    });
  };
}
