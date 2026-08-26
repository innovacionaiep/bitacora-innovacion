import { describe, expect, it } from 'vitest';
import type { FondoGestionProyecto } from '@/lib/actions/operaciones-fondo';
import {
  clampPct,
  nextFondoTableSort,
  sortFondoGestionProyectos,
  type FondoTableSort,
} from '@/lib/fondo-gestion-table';

function row(
  patch: Partial<FondoGestionProyecto> & Pick<FondoGestionProyecto, 'id'>
): FondoGestionProyecto {
  return {
    proyecto: 'Proyecto',
    linea: null,
    sede: 'Sede',
    presupuestoAdjudicado: 0,
    avanceGantt: 0,
    avanceIndicadores: 0,
    avancePresupuestoSolicitado: 0,
    avancePresupuestoEjecutado: 0,
    avanceHonorarios: 0,
    avanceOperativoSolicitado: 0,
    avanceOperativoEjecutado: 0,
    saldoPresupuesto: 0,
    convenioFirmado: false,
    ...patch,
  };
}

describe('clampPct', () => {
  it('acota el porcentaje entre 0 y 100', () => {
    expect(clampPct(-4)).toBe(0);
    expect(clampPct(40)).toBe(40);
    expect(clampPct(140)).toBe(100);
  });
});

describe('nextFondoTableSort', () => {
  it('inicia ASC al hacer clic en una columna nueva', () => {
    const current: FondoTableSort = { key: null, dir: 'asc' };
    expect(nextFondoTableSort(current, 'gantt')).toEqual({
      key: 'gantt',
      dir: 'asc',
    });
  });

  it('pasa a DESC si se vuelve a hacer clic en la misma columna', () => {
    expect(
      nextFondoTableSort({ key: 'gantt', dir: 'asc' }, 'gantt')
    ).toEqual({ key: 'gantt', dir: 'desc' });
  });

  it('limpia el sort al tercer clic en la misma columna', () => {
    expect(
      nextFondoTableSort({ key: 'gantt', dir: 'desc' }, 'gantt')
    ).toEqual({ key: null, dir: 'asc' });
  });
});

describe('sortFondoGestionProyectos', () => {
  const rows = [
    row({
      id: 'a',
      proyecto: 'Zeta',
      linea: 'Innovación Social',
      sede: 'Calama',
      presupuestoAdjudicado: 400_000,
      avanceGantt: 11,
      avanceIndicadores: 0,
      avancePresupuestoSolicitado: 30,
      avancePresupuestoEjecutado: 10,
      avanceHonorarios: 20,
      avanceOperativoSolicitado: 30,
      avanceOperativoEjecutado: 10,
      saldoPresupuesto: -50_000,
    }),
    row({
      id: 'b',
      proyecto: 'Alfa',
      linea: null,
      sede: 'Bellavista',
      presupuestoAdjudicado: 1_000_000,
      avanceGantt: 0,
      avanceIndicadores: 50,
      avancePresupuestoSolicitado: 5,
      avancePresupuestoEjecutado: 40,
      avanceHonorarios: 80,
      avanceOperativoSolicitado: 5,
      avanceOperativoEjecutado: 40,
      saldoPresupuesto: 120_000,
    }),
  ];

  it('no muta el arreglo original', () => {
    const copy = [...rows];
    sortFondoGestionProyectos(rows, { key: 'proyecto', dir: 'asc' });
    expect(rows.map((r) => r.id)).toEqual(copy.map((r) => r.id));
  });

  it('ordena texto por proyecto (es)', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'proyecto',
      dir: 'asc',
    });
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('ordena números de Gantt DESC', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'gantt',
      dir: 'desc',
    });
    expect(sorted.map((r) => r.avanceGantt)).toEqual([11, 0]);
  });

  it('trata línea vacía como texto vacío al ordenar', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'linea',
      dir: 'asc',
    });
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('ordena por presupuesto ejecutado DESC', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'presupuestoEjecutado',
      dir: 'desc',
    });
    expect(sorted.map((r) => r.avanceOperativoEjecutado)).toEqual([40, 10]);
  });

  it('ordena por honorarios DESC', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'honorarios',
      dir: 'desc',
    });
    expect(sorted.map((r) => r.avanceHonorarios)).toEqual([80, 20]);
  });

  it('ordena por saldo ASC (negativos primero)', () => {
    const sorted = sortFondoGestionProyectos(rows, {
      key: 'saldo',
      dir: 'asc',
    });
    expect(sorted.map((r) => r.saldoPresupuesto)).toEqual([-50_000, 120_000]);
  });

  it('devuelve el orden original si no hay columna activa', () => {
    const sorted = sortFondoGestionProyectos(rows, { key: null, dir: 'asc' });
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
