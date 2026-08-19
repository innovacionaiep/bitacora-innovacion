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
    const saldo = monto - montoSolicitado;

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
    (pctTotalSolicitado + pctTotalEjecutado) / 2
  );
  const totalSaldo = totalMonto - totalSolicitado;

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

/** Ítems DELTA manuales (legacy) no participan en totales ni listado editable. */
export function isDeltaPresupuestoItem(item: { item: string }): boolean {
  return item.item.trim().toUpperCase() === 'DELTA';
}

/** Saldo adjudicado − suma de montos declarados (puede ser negativo). */
export function computeDeltaSaldo(
  presupuestoAdjudicado: number,
  items: Array<{ item: string; monto: number }>
): number {
  const totalDeclarado = items
    .filter((i) => !isDeltaPresupuestoItem(i))
    .reduce((s, i) => s + i.monto, 0);
  return presupuestoAdjudicado - totalDeclarado;
}

export function formatPresupuestoMonto(monto: number): string {
  const abs = Math.abs(monto).toLocaleString('es-CL');
  return monto < 0 ? `-$${abs}` : `$${abs}`;
}

/** Incorpora el delta virtual (cuenta Operación, pendiente) al resumen macro superior. */
export function mergeDeltaEnResumen(
  resumen: ResumenPresupuesto,
  deltaSaldo: number
): ResumenPresupuesto {
  if (deltaSaldo === 0) return resumen;

  const totalMonto = resumen.totalMonto + deltaSaldo;
  const totalSaldo = totalMonto - resumen.totalSolicitado;

  const porCuenta = resumen.porCuenta.map((row) => {
    if (row.cuenta !== 'OPERACION') {
      return {
        ...row,
        porcentajePeso: totalMonto > 0 ? (row.monto / totalMonto) * 100 : 0,
      };
    }
    const monto = row.monto + deltaSaldo;
    const pctSolicitado =
      monto > 0 ? (row.montoSolicitado / monto) * 100 : 0;
    const pctEnPedido = monto > 0 ? (row.montoEnPedido / monto) * 100 : 0;
    const pctEjecutado = monto > 0 ? (row.montoEjecutado / monto) * 100 : 0;
    return {
      ...row,
      monto,
      porcentajePeso: totalMonto > 0 ? (monto / totalMonto) * 100 : 0,
      pctSolicitado,
      pctEnPedido,
      pctEjecutado,
      saldo: monto - row.montoSolicitado,
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

  return {
    ...resumen,
    totalMonto,
    totalSaldo,
    porCuenta,
    pctTotalSolicitado,
    pctTotalEnPedido,
    pctTotalEjecutado,
    pctGlobalAvance: Math.round(
      (pctTotalSolicitado + pctTotalEjecutado) / 2
    ),
  };
}

/** % del tab Presupuesto: fila total (% Solicitado / % Ejecutado) y barra global. */
export function computeAvancePresupuestoDesglose(
  items: Array<ItemBase & { item: string }>,
  presupuestoAdjudicado = 0
): { solicitado: number; ejecutado: number; global: number } {
  const itemsGasto = items.filter((i) => !isDeltaPresupuestoItem(i));
  const resumen = computeResumenPresupuesto(itemsGasto);
  const delta = computeDeltaSaldo(presupuestoAdjudicado, itemsGasto);
  const merged = mergeDeltaEnResumen(resumen, delta);
  return {
    solicitado: Math.round(merged.pctTotalSolicitado),
    ejecutado: Math.round(merged.pctTotalEjecutado),
    global: merged.pctGlobalAvance,
  };
}

/** Mismo % de progreso que la barra del tab Presupuesto (con delta y promedios solicitado/ejecutado). */
export function computeAvancePresupuestoPct(
  items: Array<ItemBase & { item: string }>,
  presupuestoAdjudicado = 0
): number {
  return computeAvancePresupuestoDesglose(items, presupuestoAdjudicado).global;
}
