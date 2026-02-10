'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPresupuestoByProyecto } from '@/lib/actions/presupuesto';
import type {
  ItemPresupuestoItem,
  ResumenPresupuesto,
  CuentaPresupuesto,
} from '@/types/presupuesto';

const CUENTAS: CuentaPresupuesto[] = ['RRHH', 'OPERACION', 'INVERSION'];

function computeResumen(
  items: ItemPresupuestoItem[],
  _presupuestoTotalProyecto: number
): ResumenPresupuesto {
  const totalMonto = items.reduce((s, i) => s + i.monto, 0);
  const totalSolicitado = items
    .filter(
      (i) =>
        i.estado === 'SOLICITADO' ||
        i.estado === 'EN_PEDIDO' ||
        i.estado === 'EJECUTADO_OK'
    )
    .reduce((s, i) => s + i.monto, 0);
  const totalEnPedido = items
    .filter((i) => i.estado === 'EN_PEDIDO' || i.estado === 'EJECUTADO_OK')
    .reduce((s, i) => s + i.monto, 0);
  const totalEjecutado = items
    .filter((i) => i.estado === 'EJECUTADO_OK')
    .reduce((s, i) => s + i.monto, 0);

  // 100% = suma total de todos los gastos del proyecto (dinámico)
  const baseTotal = totalMonto || 1;
  const pctGlobalAvance =
    baseTotal > 0 ? Math.round((totalEjecutado / baseTotal) * 100) : 0;

  const porCuenta = CUENTAS.map((cuenta) => {
    const filtrados = items.filter((i) => i.cuenta === cuenta);
    const monto = filtrados.reduce((s, i) => s + i.monto, 0);
    const montoSolicitado = filtrados
      .filter(
        (i) =>
          i.estado === 'SOLICITADO' ||
          i.estado === 'EN_PEDIDO' ||
          i.estado === 'EJECUTADO_OK'
      )
      .reduce((s, i) => s + i.monto, 0);
    const montoEnPedido = filtrados
      .filter((i) => i.estado === 'EN_PEDIDO' || i.estado === 'EJECUTADO_OK')
      .reduce((s, i) => s + i.monto, 0);
    const montoEjecutado = filtrados
      .filter((i) => i.estado === 'EJECUTADO_OK')
      .reduce((s, i) => s + i.monto, 0);

    const porcentajePeso = totalMonto > 0 ? (monto / totalMonto) * 100 : 0;
    const pctSolicitado = monto > 0 ? (montoSolicitado / monto) * 100 : 0;
    const pctEnPedido = monto > 0 ? (montoEnPedido / monto) * 100 : 0;
    const pctEjecutado = monto > 0 ? (montoEjecutado / monto) * 100 : 0;
    // % Avance Cuenta = promedio de % Solicitado, % En Pedido y % Ejecutado
    const pctTotal = (pctSolicitado + pctEnPedido + pctEjecutado) / 3;

    return {
      cuenta,
      monto,
      porcentajePeso,
      montoSolicitado,
      montoEnPedido,
      montoEjecutado,
      pctSolicitado,
      pctEnPedido,
      pctEjecutado,
      pctTotal,
    };
  });

  return {
    totalMonto,
    totalSolicitado,
    totalEnPedido,
    totalEjecutado,
    pctGlobalAvance,
    porCuenta,
  };
}

export function usePresupuesto(
  projectId: string | null,
  presupuestoTotalProyecto: number = 0
) {
  const [items, setItems] = useState<ItemPresupuestoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumenPorCuenta = useMemo<ResumenPresupuesto>(
    () => computeResumen(items, presupuestoTotalProyecto),
    [items, presupuestoTotalProyecto]
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
