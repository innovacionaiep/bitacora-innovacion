import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaProjectFilters = {
  fondos: string[];
  sedes: string[];
  escuelas: string[];
  etiquetas: string[];
};

export const EMPTY_VITRINA_FILTERS: VitrinaProjectFilters = {
  fondos: [],
  sedes: [],
  escuelas: [],
  etiquetas: [],
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

function isExcludedVitrinaFondo(nombre: string): boolean {
  return (
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase() === 'fondo pruebas'
  );
}

/** Catálogo primero (su orden); nombres solo en proyectos, al final. */
export function mergeVitrinaFilterNames(
  catalogNames: string[],
  extraNames: string[] = [],
  exclude?: (name: string) => boolean,
): string[] {
  const seen = new Set<string>();
  const fromCatalog: string[] = [];
  for (const name of catalogNames) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed) || exclude?.(trimmed)) continue;
    seen.add(trimmed);
    fromCatalog.push(trimmed);
  }
  const extras = uniqueSorted(
    extraNames.filter((name) => !seen.has(name) && !exclude?.(name)),
  );
  return [...fromCatalog, ...extras];
}

export function uniqueVitrinaFilterOptions(
  catalogs: VitrinaProjectFilters,
  proyectos: VitrinaProyecto[] = [],
): VitrinaProjectFilters {
  return {
    fondos: mergeVitrinaFilterNames(
      catalogs.fondos,
      proyectos.flatMap((p) => p.fondos),
      isExcludedVitrinaFondo,
    ),
    sedes: mergeVitrinaFilterNames(
      catalogs.sedes,
      proyectos.flatMap((p) => p.sedes),
    ),
    escuelas: mergeVitrinaFilterNames(
      catalogs.escuelas,
      proyectos.flatMap((p) => p.escuelas),
    ),
    etiquetas: mergeVitrinaFilterNames(
      catalogs.etiquetas,
      proyectos.flatMap((p) => p.etiquetas),
    ),
  };
}

function matchesFacet(values: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

export function filterVitrinaProyectos(
  proyectos: VitrinaProyecto[],
  filters: VitrinaProjectFilters,
): VitrinaProyecto[] {
  return proyectos.filter(
    (proyecto) =>
      matchesFacet(proyecto.fondos, filters.fondos) &&
      matchesFacet(proyecto.sedes, filters.sedes) &&
      matchesFacet(proyecto.escuelas, filters.escuelas) &&
      matchesFacet(proyecto.etiquetas, filters.etiquetas),
  );
}

export function toggleVitrinaFilterValue(
  selected: string[],
  value: string,
): string[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

export function vitrinaFiltersAreActive(filters: VitrinaProjectFilters): boolean {
  return (
    filters.fondos.length > 0 ||
    filters.sedes.length > 0 ||
    filters.escuelas.length > 0 ||
    filters.etiquetas.length > 0
  );
}

/** null = sin recorte de I.A.; [] = la I.A. no encontró coincidencias. */
export function applyVitrinaAiMatchIds(
  proyectos: VitrinaProyecto[],
  matchIds: string[] | null,
): VitrinaProyecto[] {
  if (matchIds == null) return proyectos;
  const allowed = new Set(matchIds);
  return proyectos.filter((proyecto) => allowed.has(proyecto.id));
}

export function vitrinaDiscoveryIsActive(
  filters: VitrinaProjectFilters,
  matchIds: string[] | null,
): boolean {
  return vitrinaFiltersAreActive(filters) || matchIds != null;
}

/** El recorte actual lo aplicó el agente, no un toggle manual del sidebar. */
export function vitrinaAiFilterIsActive(aiApplied: boolean): boolean {
  return aiApplied;
}
