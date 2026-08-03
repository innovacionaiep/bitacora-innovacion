'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategoriasWithSubcategorias } from '@/lib/actions/desarrollo-tecnico-config';
import { desarrolloTecnicoConfigKey } from '@/lib/query-keys';

const STALE_TIME = 5 * 60_000;

export type DesarrolloTecnicoCategorias = Awaited<
  ReturnType<typeof getCategoriasWithSubcategorias>
>;

export function useDesarrolloTecnicoConfigQuery() {
  return useQuery({
    queryKey: desarrolloTecnicoConfigKey,
    queryFn: () => getCategoriasWithSubcategorias(),
    staleTime: STALE_TIME,
  });
}

export function usePrefetchDesarrolloTecnicoConfig() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: desarrolloTecnicoConfigKey,
      queryFn: () => getCategoriasWithSubcategorias(),
      staleTime: STALE_TIME,
    });
  }, [queryClient]);
}

export function useFetchDesarrolloTecnicoConfig() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: desarrolloTecnicoConfigKey,
        queryFn: () => getCategoriasWithSubcategorias(),
        staleTime: STALE_TIME,
      }),
    [queryClient]
  );
}
