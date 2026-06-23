'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPresupuestoByProyecto } from '@/lib/actions/presupuesto';
import { computeResumenPresupuesto } from '@/lib/utils/presupuesto-calculos';
import type { ItemPresupuestoItem, ResumenPresupuesto } from '@/types/presupuesto';

export function usePresupuesto(
  projectId: string | null,
  _presupuestoTotalProyecto: number = 0
) {
  const [items, setItems] = useState<ItemPresupuestoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumenPorCuenta = useMemo<ResumenPresupuesto>(
    () => computeResumenPresupuesto(items),
    [items]
  );

  const refetch = async (showLoading = true) => {
    if (!projectId) {
      setItems([]);
      return;
    }
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await getPresupuestoByProyecto(projectId);
      if (result.success && result.data) {
        setItems(result.data.items as ItemPresupuestoItem[]);
      } else {
        setError(result.error ?? 'Error al cargar presupuesto');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [projectId]);

  return {
    items,
    resumenPorCuenta,
    loading,
    error,
    refetch,
  };
}
