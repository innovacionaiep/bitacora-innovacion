import type { MideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';
import { toggleVitrinaFilterValue } from '@/lib/vitrina-project-filters';

export type VinculamosFilterFacet =
  | 'ids'
  | 'nombres'
  | 'estados'
  | 'fechas'
  | 'mecanismos';

export type VinculamosFilters = Record<VinculamosFilterFacet, string[]>;

export const EMPTY_VINCULAMOS_FILTERS: VinculamosFilters = {
  ids: [],
  nombres: [],
  estados: [],
  fechas: [],
  mecanismos: [],
};

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
  return (
    filters.ids.length > 0 ||
    filters.nombres.length > 0 ||
    filters.estados.length > 0 ||
    filters.fechas.length > 0 ||
    filters.mecanismos.length > 0
  );
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
  };
}

function matchesFacet(selected: string[], value: string): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

export function filterVinculamosRows(
  rows: MideimpactoIniciativa[],
  filters: VinculamosFilters,
): MideimpactoIniciativa[] {
  if (!vinculamosFiltersAreActive(filters)) return rows;
  return rows.filter((row) => {
    if (!matchesFacet(filters.ids, row.id)) return false;
    if (!matchesFacet(filters.nombres, row.nombre)) return false;
    if (!matchesFacet(filters.estados, row.estado)) return false;
    if (!matchesFacet(filters.mecanismos, row.mecanismo)) return false;
    if (filters.fechas.length > 0) {
      const years = iniciativaFechaYears(row);
      if (!years.some((year) => filters.fechas.includes(year))) return false;
    }
    return true;
  });
}
