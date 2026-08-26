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
    ).toEqual({
      solicitado: 100,
      ejecutado: 0,
      global: 50,
      saldo: 0,
      honorarios: 0,
      operativoSolicitado: 100,
      operativoEjecutado: 0,
    });
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
    ).toEqual({
      solicitado: 100,
      ejecutado: 100,
      global: 100,
      saldo: 0,
      honorarios: 0,
      operativoSolicitado: 100,
      operativoEjecutado: 100,
    });
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
    // adjudicado 100 − declarado 50 = DELTA +50
    expect(desglose.saldo).toBe(50);
  });

  it('puede devolver DELTA negativo si lo declarado supera el adjudicado', () => {
    const desglose = computeAvancePresupuestoDesglose(
      [
        {
          cuenta: 'OPERACION',
          item: 'Viaje',
          monto: 100,
          estado: 'SOLICITADO',
        },
      ],
      50
    );
    // adjudicado 50 − declarado 100 = DELTA -50
    expect(desglose.saldo).toBe(-50);
  });

  it('DELTA es 0 cuando adjudicado coincide con lo declarado aunque haya saldo de solicitud', () => {
    // totalSaldo TOTALES sería 100 (nada solicitado); DELTA es 0
    const desglose = computeAvancePresupuestoDesglose(
      [
        {
          cuenta: 'OPERACION',
          item: 'Viaje',
          monto: 100,
          estado: 'PENDIENTE',
        },
      ],
      100
    );
    expect(desglose.saldo).toBe(0);
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

  it('Honorarios es el % Solicitado de RRHH; Operativo pondera Operación e Inversión por monto', () => {
    const desglose = computeAvancePresupuestoDesglose(
      [
        {
          cuenta: 'RRHH',
          item: 'Honorarios',
          monto: 200,
          estado: 'SOLICITADO',
        },
        {
          cuenta: 'OPERACION',
          item: 'Viaje',
          monto: 50,
          estado: 'EJECUTADO_OK',
        },
        {
          cuenta: 'INVERSION',
          item: 'Equipo',
          monto: 150,
          estado: 'PENDIENTE',
        },
      ],
      400
    );
    expect(desglose.honorarios).toBe(100);
    // Operativo: (50 solicitado+ejecutado + 0) / (50+150) = 25%
    expect(desglose.operativoSolicitado).toBe(25);
    expect(desglose.operativoEjecutado).toBe(25);
  });

  it('el DELTA suma al denominador operativo (cuenta Operación)', () => {
    const desglose = computeAvancePresupuestoDesglose(
      [
        {
          cuenta: 'OPERACION',
          item: 'Viaje',
          monto: 50,
          estado: 'SOLICITADO',
        },
        {
          cuenta: 'INVERSION',
          item: 'Equipo',
          monto: 100,
          estado: 'SOLICITADO',
        },
      ],
      200
    );
    // Delta +50 en Operación: montos 100+100, solicitados 50+100 → 75%
    expect(desglose.operativoSolicitado).toBe(75);
    expect(desglose.operativoEjecutado).toBe(0);
    expect(desglose.honorarios).toBe(0);
  });
});
