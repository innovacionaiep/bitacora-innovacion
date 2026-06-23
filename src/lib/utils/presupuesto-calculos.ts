import type { CuentaPresupuesto, ResumenPresupuesto } from '@/types/presupuesto';

const CUENTAS: CuentaPresupuesto[] = ['RRHH', 'OPERACION', 'INVERSION'];

type ItemBase = {
  cuenta: CuentaPresupuesto;
  monto: number;
  estado: 'PENDIENTE' | 'SOLICITADO' | 'EN_PEDIDO' | 'EJECUTADO_OK';
};

/**
 * Promedio ponderado por monto de cuenta, excluyendo cuentas con monto 0.
 * Equivalente a: SUMPRODUCT(montos, pcts) / SUMIF(montos, ">0")
 */
export function promedioPonderadoPorMonto(
  cuentas: Array<{ monto: number; pct: number }>
): number {
  const conMonto = cuentas.filter((c) => c.monto > 0);
  if (conMonto.length === 0) return 0;
  const sumaPonderada = conMonto.reduce((s, c) => s + c.monto * c.pct, 0);
  const sumaMontos = conMonto.reduce((s, c) => s + c.monto, 0);
  return sumaMontos > 0 ? sumaPonderada / sumaMontos : 0;
}

export function computeResumenPresupuesto(
  items: ItemBase[]
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
    const saldo = monto - montoEjecutado;

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
      saldo,
    };
  });

  const pctTotalSolicitado = promedioPonderadoPorMonto(
    porCuenta.map((c) => ({ monto: c.monto, pct: c.pctSolicitado }))
  );
  const pctTotalEnPedido = promedioPonderadoPorMonto(
    porCuenta.map((c) => ({ monto: c.monto, pct: c.pctEnPedido }))
  );
  const pctTotalEjecutado = promedioPonderadoPorMonto(
    porCuenta.map((c) => ({ monto: c.monto, pct: c.pctEjecutado }))
  );

  const pctGlobalAvance = Math.round(
    (pctTotalSolicitado + pctTotalEnPedido + pctTotalEjecutado) / 3
  );
  const totalSaldo = totalMonto - totalEjecutado;

  return {
    totalMonto,
    totalSolicitado,
    totalEnPedido,
    totalEjecutado,
    totalSaldo,
    pctTotalSolicitado,
    pctTotalEnPedido,
    pctTotalEjecutado,
    pctGlobalAvance,
    porCuenta,
  };
}
