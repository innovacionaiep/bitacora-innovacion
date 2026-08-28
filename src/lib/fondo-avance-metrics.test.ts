import { describe, expect, it } from 'vitest';
import { computeFondoAvanceMetrics } from '@/lib/fondo-avance-metrics';

describe('computeFondoAvanceMetrics', () => {
  it('usa presupuestoAdjudicado si es > 0', () => {
    const metrics = computeFondoAvanceMetrics(
      {
        avanceGantt: 4,
        objetivos: 10,
        presupuestoAdjudicado: 400_000,
        presupuestoTotal: 1,
      },
      [],
    );
    expect(metrics.presupuestoAdjudicado).toBe(400_000);
    expect(metrics.avanceGantt).toBe(4);
    expect(metrics.avanceIndicadores).toBe(10);
  });

  it('cae a presupuestoTotal y luego a suma de ítems no-DELTA', () => {
    expect(
      computeFondoAvanceMetrics(
        {
          avanceGantt: 0,
          objetivos: 0,
          presupuestoAdjudicado: 0,
          presupuestoTotal: 50_000,
        },
        [],
      ).presupuestoAdjudicado,
    ).toBe(50_000);

    expect(
      computeFondoAvanceMetrics(
        {
          avanceGantt: 0,
          objetivos: 0,
          presupuestoAdjudicado: 0,
          presupuestoTotal: 0,
        },
        [
          {
            cuenta: 'OPERACION',
            monto: 10_000,
            estado: 'PENDIENTE',
            item: 'Viaje',
          },
          {
            cuenta: 'OPERACION',
            monto: 99,
            estado: 'PENDIENTE',
            item: 'DELTA',
          },
        ],
      ).presupuestoAdjudicado,
    ).toBe(10_000);
  });
});
