'use client';

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPresupuestoByProyecto } from '@/lib/actions/presupuesto';
import {
  computeResumenPresupuesto,
  isDeltaPresupuestoItem,
} from '@/lib/utils/presupuesto-calculos';
import type { ItemPresupuestoItem, ResumenPresupuesto } from '@/types/presupuesto';
import type { UpdateItemPresupuestoData } from '@/lib/actions/presupuesto';
import { presupuestoKey } from '@/lib/query-keys';

export function usePresupuesto(
  projectId: string | null,
  _presupuestoTotalProyecto: number = 0
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectId ? presupuestoKey(projectId) : ['presupuesto', 'none'],
    queryFn: async () => {
      if (!projectId) return [] as ItemPresupuestoItem[];
      const result = await getPresupuestoByProyecto(projectId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Error al cargar presupuesto');
      }
      return result.data.items as ItemPresupuestoItem[];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const items = query.data ?? [];

  const setItems = useCallback(
    (
      update:
        | ItemPresupuestoItem[]
        | ((prev: ItemPresupuestoItem[]) => ItemPresupuestoItem[])
    ) => {
      if (!projectId) return;
      queryClient.setQueryData<ItemPresupuestoItem[]>(
        presupuestoKey(projectId),
        (prev) => {
          const current = prev ?? [];
          return typeof update === 'function' ? update(current) : update;
        }
      );
    },
    [projectId, queryClient]
  );

  const itemsGasto = useMemo(
    () => items.filter((i) => !isDeltaPresupuestoItem(i)),
    [items]
  );

  const resumenPorCuenta = useMemo<ResumenPresupuesto>(
    () => computeResumenPresupuesto(itemsGasto),
    [itemsGasto]
  );

  const refetch = useCallback(
    async (showLoading = true) => {
      if (!projectId) {
        return;
      }
      if (showLoading) {
        await queryClient.invalidateQueries({
          queryKey: presupuestoKey(projectId),
        });
      }
      await queryClient.fetchQuery({
        queryKey: presupuestoKey(projectId),
        queryFn: async () => {
          const result = await getPresupuestoByProyecto(projectId);
          if (!result.success || !result.data) {
            throw new Error(result.error ?? 'Error al cargar presupuesto');
          }
          return result.data.items as ItemPresupuestoItem[];
        },
        staleTime: showLoading ? 0 : 60_000,
      });
    },
    [projectId, queryClient]
  );

  const patchItem = useCallback(
    (itemId: string, data: UpdateItemPresupuestoData) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? ({
                ...item,
                ...data,
              } as ItemPresupuestoItem)
            : item
        )
      );
    },
    [setItems]
  );

  const addItemOptimistic = useCallback(
    (item: ItemPresupuestoItem) => {
      setItems((prev) => [...prev, item]);
    },
    [setItems]
  );

  const removeItemOptimistic = useCallback(
    (itemId: string) => {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    },
    [setItems]
  );

  const replaceItemId = useCallback(
    (tempId: string, realId: string) => {
      setItems((prev) =>
        prev.map((item) => (item.id === tempId ? { ...item, id: realId } : item))
      );
    },
    [setItems]
  );

  return {
    items: itemsGasto,
    allItems: items,
    setItems,
    patchItem,
    addItemOptimistic,
    removeItemOptimistic,
    replaceItemId,
    resumenPorCuenta,
    loading: query.isLoading && !query.data,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Error desconocido'
      : null,
    refetch,
  };
}
