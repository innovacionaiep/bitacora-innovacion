import { describe, expect, it } from 'vitest';
import type { PortalAvancesProyecto } from '@/lib/portal-avances';
import {
  nextPortalAvancesSort,
  sortPortalAvancesProyectos,
} from '@/lib/portal-avances-table';

function row(
  patch: Partial<PortalAvancesProyecto> & Pick<PortalAvancesProyecto, 'id'>,
): PortalAvancesProyecto {
  return {
    fondo: 'Innovación Docente',
    proyecto: 'Proyecto',
    sede: 'Sede',
    escuelas: [],
    presupuestoAdjudicado: 0,
    avanceGantt: 0,
    avanceIndicadores: 0,
    avancePresupuestoSolicitado: 0,
    avancePresupuestoEjecutado: 0,
    avanceHonorarios: 0,
    avanceOperativoSolicitado: 0,
    avanceOperativoEjecutado: 0,
    saldoPresupuesto: 0,
    ...patch,
  };
}

describe('sortPortalAvancesProyectos', () => {
  const rows = [
    row({
      id: 'a',
      proyecto: 'Zeta',
      sede: 'Calama',
      escuelas: ['Salud'],
      avanceGantt: 11,
    }),
    row({
      id: 'b',
      proyecto: 'Alfa',
      sede: 'Bellavista',
      escuelas: ['Negocios'],
      avanceGantt: 0,
    }),
  ];

  it('ordena por escuelas', () => {
    const sorted = sortPortalAvancesProyectos(rows, {
      key: 'escuelas',
      dir: 'asc',
    });
    expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('ordena por encargado', () => {
    const named = [
      row({ id: 'a', encargado: 'zara@aiep.cl' }),
      row({ id: 'b', encargado: 'ana@aiep.cl' }),
    ];
    expect(
      sortPortalAvancesProyectos(named, { key: 'encargado', dir: 'asc' }).map(
        (r) => r.id,
      ),
    ).toEqual(['b', 'a']);
  });

  it('ordena por carreras y asignaturas', () => {
    const named = [
      row({ id: 'a', carreras: ['Zootecnia'], asignaturas: ['Química'] }),
      row({ id: 'b', carreras: ['Enfermería'], asignaturas: ['Anatomía'] }),
    ];
    expect(
      sortPortalAvancesProyectos(named, { key: 'carreras', dir: 'asc' }).map(
        (r) => r.id,
      ),
    ).toEqual(['b', 'a']);
    expect(
      sortPortalAvancesProyectos(named, { key: 'asignaturas', dir: 'asc' }).map(
        (r) => r.id,
      ),
    ).toEqual(['b', 'a']);
  });

  it('ordena No aplica de Gantt antes que 0%', () => {
    const named = [
      row({ id: 'a', avanceGantt: 0 }),
      row({ id: 'b', avanceGantt: 0, ganttNoAplica: true }),
      row({ id: 'c', avanceGantt: 50 }),
    ];
    expect(
      sortPortalAvancesProyectos(named, { key: 'gantt', dir: 'asc' }).map(
        (r) => r.id,
      ),
    ).toEqual(['b', 'a', 'c']);
  });

  it('ciclo de sort igual que Fondos', () => {
    expect(nextPortalAvancesSort({ key: null, dir: 'asc' }, 'gantt')).toEqual({
      key: 'gantt',
      dir: 'asc',
    });
    expect(
      nextPortalAvancesSort({ key: 'gantt', dir: 'asc' }, 'gantt'),
    ).toEqual({ key: 'gantt', dir: 'desc' });
    expect(
      nextPortalAvancesSort({ key: 'gantt', dir: 'desc' }, 'gantt'),
    ).toEqual({ key: null, dir: 'asc' });
  });
});
