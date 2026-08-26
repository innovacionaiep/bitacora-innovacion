export type FondoTableSortKey =
  | 'proyecto'
  | 'linea'
  | 'sede'
  | 'presupuestoAdjudicado'
  | 'gantt'
  | 'indicadores'
  | 'presupuestoSolicitado'
  | 'presupuestoEjecutado'
  | 'honorarios'
  | 'saldo';

export type FondoTableSort = {
  key: FondoTableSortKey | null;
  dir: 'asc' | 'desc';
};

export type FondoTableRow = {
  proyecto: string;
  linea: string | null;
  sede: string;
  presupuestoAdjudicado: number;
  avanceGantt: number;
  avanceIndicadores: number;
  avanceOperativoSolicitado: number;
  avanceOperativoEjecutado: number;
  avanceHonorarios: number;
  saldoPresupuesto: number;
};

export function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function nextFondoTableSort(
  current: FondoTableSort,
  key: FondoTableSortKey
): FondoTableSort {
  if (current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return { key: null, dir: 'asc' };
}

function sortValue(
  row: FondoTableRow,
  key: FondoTableSortKey
): string | number {
  switch (key) {
    case 'proyecto':
      return row.proyecto;
    case 'linea':
      return row.linea ?? '';
    case 'sede':
      return row.sede;
    case 'presupuestoAdjudicado':
      return row.presupuestoAdjudicado;
    case 'gantt':
      return row.avanceGantt;
    case 'indicadores':
      return row.avanceIndicadores;
    case 'presupuestoSolicitado':
      return row.avanceOperativoSolicitado;
    case 'presupuestoEjecutado':
      return row.avanceOperativoEjecutado;
    case 'honorarios':
      return row.avanceHonorarios;
    case 'saldo':
      return row.saldoPresupuesto;
  }
}

export function sortFondoGestionProyectos<T extends FondoTableRow>(
  rows: T[],
  sort: FondoTableSort
): T[] {
  if (!sort.key) return [...rows];
  const key = sort.key;
  const copy = [...rows];
  copy.sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    const res =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    return sort.dir === 'asc' ? res : -res;
  });
  return copy;
}
