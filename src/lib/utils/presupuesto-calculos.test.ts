import { describe, expect, it } from 'vitest';
import {
  computeAvancePresupuestoDesglose,
  computeAvancePresupuestoPct,
} from '@/lib/utils/presupuesto-calculos';

describe('computeAvancePresupuestoDesglose', () => {
  it('marca 100% solicitado y 0% ejecutado si el ítem está solicitado', () => {
    expect(
      computeAvancePresupuestoDesglose(
        [
          {
            cuenta: 'OPERACION',
            item: 'Viaje',
            monto: 100,
            estado: 'SOLICITADO',
          },
        ],
        100
      )
    ).toEqual({ solicitado: 100, ejecutado: 0, global: 50 });
  });

  it('marca 100% solicitado y 100% ejecutado si el ítem está ejecutado', () => {
    expect(
      computeAvancePresupuestoDesglose(
        [
          {
            cuenta: 'OPERACION',
            item: 'Viaje',
            monto: 100,
            estado: 'EJECUTADO_OK',
          },
        ],
        100
      )
    ).toEqual({ solicitado: 100, ejecutado: 100, global: 100 });
  });

  it('diluye con el delta de presupuesto adjudicado no declarado', () => {
    const desglose = computeAvancePresupuestoDesglose(
      [
        {
          cuenta: 'OPERACION',
          item: 'Viaje',
          monto: 50,
          estado: 'EJECUTADO_OK',
        },
      ],
      100
    );
    expect(desglose.solicitado).toBe(50);
    expect(desglose.ejecutado).toBe(50);
    expect(desglose.global).toBe(50);
  });

  it('mantiene computeAvancePresupuestoPct como el global del tab', () => {
    const items = [
      {
        cuenta: 'RRHH' as const,
        item: 'Honorarios',
        monto: 200,
        estado: 'SOLICITADO' as const,
      },
    ];
    const desglose = computeAvancePresupuestoDesglose(items, 200);
    expect(computeAvancePresupuestoPct(items, 200)).toBe(desglose.global);
  });
});
