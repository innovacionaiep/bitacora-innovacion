import { clampPct } from '@/lib/fondo-gestion-table';
import type { PortalAvancesProyecto } from '@/lib/portal-avances';
import { formatPortalAvancesEscuelas } from '@/lib/portal-avances';

export type PortalAvancesSortKey =
  | 'proyecto'
  | 'sede'
  | 'escuelas'
  | 'presupuestoAdjudicado'
  | 'gantt'
  | 'indicadores'
  | 'presupuestoSolicitado'
  | 'presupuestoEjecutado'
  | 'honorarios'
  | 'saldo'
  | 'idVinculamos'
  | 'estudiantes'
  | 'docentes'
  | 'beneficiarios';

export type PortalAvancesSort = {
  key: PortalAvancesSortKey | null;
  dir: 'asc' | 'desc';
};

export function nextPortalAvancesSort(
  current: PortalAvancesSort,
  key: PortalAvancesSortKey,
): PortalAvancesSort {
  if (current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return { key: null, dir: 'asc' };
}

function sortValue(
  row: PortalAvancesProyecto,
  key: PortalAvancesSortKey,
): string | number {
  switch (key) {
    case 'proyecto':
      return row.proyecto;
    case 'sede':
      return row.sede;
    case 'escuelas':
      return formatPortalAvancesEscuelas(row.escuelas);
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
      return row.honorariosNoAplica ? -1 : row.avanceHonorarios;
    case 'saldo':
      return row.saldoPresupuesto;
    case 'idVinculamos':
      return row.idVinculamos ?? '';
    case 'estudiantes':
      return row.estudiantes ?? -1;
    case 'docentes':
      return row.docentes ?? -1;
    case 'beneficiarios':
      return row.beneficiarios ?? -1;
  }
}

export function sortPortalAvancesProyectos(
  rows: PortalAvancesProyecto[],
  sort: PortalAvancesSort,
): PortalAvancesProyecto[] {
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

export { clampPct };
