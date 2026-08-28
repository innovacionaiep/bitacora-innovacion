import {
  computeAvancePresupuestoDesglose,
  isDeltaPresupuestoItem,
} from '@/lib/utils/presupuesto-calculos';

export type FondoAvanceItem = {
  cuenta: 'RRHH' | 'OPERACION' | 'INVERSION';
  monto: number;
  estado: 'PENDIENTE' | 'SOLICITADO' | 'EN_PEDIDO' | 'EJECUTADO_OK';
  item: string;
};

export type FondoAvanceMetrics = {
  presupuestoAdjudicado: number;
  avanceGantt: number;
  avanceIndicadores: number;
  avancePresupuestoSolicitado: number;
  avancePresupuestoEjecutado: number;
  avanceHonorarios: number;
  avanceOperativoSolicitado: number;
  avanceOperativoEjecutado: number;
  saldoPresupuesto: number;
};

export function computeFondoAvanceMetrics(
  proyecto: {
    avanceGantt: number;
    objetivos: number;
    presupuestoAdjudicado: number | null | undefined;
    presupuestoTotal: number | null | undefined;
  },
  items: FondoAvanceItem[],
): FondoAvanceMetrics {
  const adjudicadoCampo = proyecto.presupuestoAdjudicado ?? 0;
  const totalDeclarado = items
    .filter((i) => !isDeltaPresupuestoItem(i))
    .reduce((s, i) => s + i.monto, 0);
  const presupuestoAdjudicado =
    adjudicadoCampo > 0
      ? adjudicadoCampo
      : (proyecto.presupuestoTotal ?? 0) > 0
        ? (proyecto.presupuestoTotal ?? 0)
        : totalDeclarado;
  const avancePresupuesto = computeAvancePresupuestoDesglose(
    items,
    adjudicadoCampo,
  );
  return {
    presupuestoAdjudicado,
    avanceGantt: proyecto.avanceGantt,
    avanceIndicadores: proyecto.objetivos,
    avancePresupuestoSolicitado: avancePresupuesto.solicitado,
    avancePresupuestoEjecutado: avancePresupuesto.ejecutado,
    avanceHonorarios: avancePresupuesto.honorarios,
    avanceOperativoSolicitado: avancePresupuesto.operativoSolicitado,
    avanceOperativoEjecutado: avancePresupuesto.operativoEjecutado,
    saldoPresupuesto: avancePresupuesto.saldo,
  };
}
