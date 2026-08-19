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
    expect(sorted.map((r) => r.avancePresupuestoEjecutado)).toEqual([40, 10]);
  });

  it('devuelve el orden original si no hay columna activa', () => {
    const sorted = sortFondoGestionProyectos(rows, { key: null, dir: 'asc' });
    expect(sorted.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
