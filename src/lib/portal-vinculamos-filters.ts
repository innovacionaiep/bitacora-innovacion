import {
  INICIATIVA_COLUMN_ORDER,
  type MideimpactoIniciativa,
  type MideimpactoIniciativaColumnKey,
} from '@/lib/mideimpacto-iniciativas';
import { toggleVitrinaFilterValue } from '@/lib/vitrina-project-filters';

export type VinculamosFilterFacet =
  | 'ids'
  | 'nombres'
  | 'estados'
  | 'fechas'
  | 'mecanismos'
  | 'sedes'
  | 'escuelas'
  | 'regiones'
  | 'comunas'
  | 'socios'
  | 'gruposInteres'
  | 'tematicas';

export type VinculamosFilters = Record<VinculamosFilterFacet, string[]>;

export const EMPTY_VINCULAMOS_FILTERS: VinculamosFilters = {
  ids: [],
  nombres: [],
  estados: [],
  fechas: [],
  mecanismos: [],
  sedes: [],
  escuelas: [],
  regiones: [],
  comunas: [],
  socios: [],
  gruposInteres: [],
  tematicas: [],
};

export const VINCULAMOS_CONTAINS_FACETS = ['nombres', 'socios'] as const;

export type VinculamosContainsFacet = (typeof VINCULAMOS_CONTAINS_FACETS)[number];

export function isVinculamosContainsFacet(
  facet: VinculamosFilterFacet,
): facet is VinculamosContainsFacet {
  return (VINCULAMOS_CONTAINS_FACETS as readonly string[]).includes(facet);
}

export function foldVinculamosFilterText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function addVinculamosContainsTerm(
  filters: VinculamosFilters,
  facet: VinculamosContainsFacet,
  value: string,
): VinculamosFilters {
  const term = value.trim();
  if (!term) return filters;
  const folded = foldVinculamosFilterText(term);
  if (filters[facet].some((item) => foldVinculamosFilterText(item) === folded)) {
    return filters;
  }
  return { ...filters, [facet]: [...filters[facet], term] };
}

export function toggleVinculamosFilter(
  filters: VinculamosFilters,
  facet: VinculamosFilterFacet,
  value: string,
): VinculamosFilters {
  return {
    ...filters,
    [facet]: toggleVitrinaFilterValue(filters[facet], value),
  };
}

export function vinculamosFiltersAreActive(filters: VinculamosFilters): boolean {
  return (Object.values(filters) as string[][]).some((values) => values.length > 0);
}

export function defaultVinculamosVisibleColumns(): MideimpactoIniciativaColumnKey[] {
  return INICIATIVA_COLUMN_ORDER.map((col) => col.key);
}

export function toggleVinculamosColumn(
  visible: MideimpactoIniciativaColumnKey[],
  key: MideimpactoIniciativaColumnKey,
): MideimpactoIniciativaColumnKey[] {
  if (visible.includes(key)) {
    if (visible.length <= 1) return visible;
    return visible.filter((item) => item !== key);
  }
  return [...visible, key];
}

export function vinculamosColumnsFilterActive(
  visible: MideimpactoIniciativaColumnKey[],
): boolean {
  return visible.length < INICIATIVA_COLUMN_ORDER.length;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true }),
  );
}

export function iniciativaFechaYears(row: MideimpactoIniciativa): string[] {
  return uniqueSorted(
    [row.fechaInicio, row.fechaTermino].map(yearFromDateText).filter(Boolean),
  );
}

export function yearFromDateText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const iso = trimmed.match(/^(\d{4})[-/]/);
  if (iso) return iso[1];
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];
  const dmy = trimmed.match(/\b(\d{4})\b/);
  return dmy?.[1] ?? '';
}

export function uniqueVinculamosFilterOptions(
  rows: MideimpactoIniciativa[],
): VinculamosFilters {
  return {
    ids: uniqueSorted(rows.map((row) => row.id)),
    nombres: uniqueSorted(rows.map((row) => row.nombre)),
    estados: uniqueSorted(rows.map((row) => row.estado)),
    fechas: uniqueSorted(rows.flatMap(iniciativaFechaYears)),
    mecanismos: uniqueSorted(rows.map((row) => row.mecanismo)),
    sedes: uniqueSorted(
      rows.flatMap((row) => row.escuelasCarreras.map((line) => line.sedeNombre)),
    ),
    escuelas: uniqueSorted(
      rows.flatMap((row) => row.escuelasCarreras.map((line) => line.escuNombre)),
    ),
    regiones: uniqueSorted(
      rows.flatMap((row) => row.territorios.map((line) => line.region)),
    ),
    comunas: uniqueSorted(
      rows.flatMap((row) => row.territorios.map((line) => line.comuna)),
    ),
    socios: uniqueSorted(
      rows.flatMap((row) =>
        row.participantesExternos.map((line) => line.socioComunitario),
      ),
    ),
    gruposInteres: uniqueSorted(rows.flatMap((row) => row.gruposInteres)),
    tematicas: uniqueSorted(rows.flatMap((row) => row.tematicas)),
  };
}

function matchesContains(terms: string[], value: string): boolean {
  if (terms.length === 0) return true;
  const haystack = foldVinculamosFilterText(value);
  if (!haystack) return false;
  return terms.some((term) => haystack.includes(foldVinculamosFilterText(term)));
}

function matchesContainsAny(terms: string[], candidates: string[]): boolean {
  if (terms.length === 0) return true;
  return candidates.some((value) => matchesContains(terms, value));
}

function matchesFacet(selected: string[], value: string): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

function matchesAny(selected: string[], candidates: string[]): boolean {
  if (selected.length === 0) return true;
  return candidates.some((value) => {
    const trimmed = value.trim();
    return trimmed !== '' && selected.includes(trimmed);
  });
}

export function filterVinculamosRows(
  rows: MideimpactoIniciativa[],
  filters: VinculamosFilters,
): MideimpactoIniciativa[] {
  if (!vinculamosFiltersAreActive(filters)) return rows;
  return rows.filter((row) => {
    if (!matchesFacet(filters.ids, row.id)) return false;
    if (!matchesContains(filters.nombres, row.nombre)) return false;
    if (!matchesFacet(filters.estados, row.estado)) return false;
    if (!matchesFacet(filters.mecanismos, row.mecanismo)) return false;
    if (filters.fechas.length > 0) {
      const years = iniciativaFechaYears(row);
      if (!years.some((year) => filters.fechas.includes(year))) return false;
    }
    if (
      !matchesAny(
        filters.sedes,
        row.escuelasCarreras.map((line) => line.sedeNombre),
      )
    ) {
      return false;
    }
    if (
      !matchesAny(
        filters.escuelas,
        row.escuelasCarreras.map((line) => line.escuNombre),
      )
    ) {
      return false;
    }
    if (
      !matchesAny(
        filters.regiones,
        row.territorios.map((line) => line.region),
      )
    ) {
      return false;
    }
    if (
      !matchesAny(
        filters.comunas,
        row.territorios.map((line) => line.comuna),
      )
    ) {
      return false;
    }
    if (
      !matchesContainsAny(
        filters.socios,
        row.participantesExternos.map((line) => line.socioComunitario),
      )
    ) {
      return false;
    }
    if (!matchesAny(filters.gruposInteres, row.gruposInteres)) return false;
    if (!matchesAny(filters.tematicas, row.tematicas)) return false;
    return true;
  });
}
