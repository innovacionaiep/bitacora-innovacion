import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';
import { portalCanSeeView, type PortalAccessKind, type PortalGuestLevel } from '@/lib/portal-guest-access';
import type { FondoAvanceMetrics } from '@/lib/fondo-avance-metrics';

export type PortalAvancesFondoSource = 'app' | 'excel' | 'external';

export type PortalAvancesFondo = {
  nombre: string;
  source: PortalAvancesFondoSource;
};

export const PORTAL_AVANCES_FONDOS: readonly PortalAvancesFondo[] = [
  { nombre: 'Innovación Docente', source: 'app' },
  { nombre: 'Reto Innovador de Especialidad', source: 'app' },
  { nombre: 'Fondo Impulsa', source: 'excel' },
  { nombre: 'MOVE Incuba', source: 'external' },
  { nombre: 'MoveLab', source: 'external' },
  { nombre: 'Proyectos Nacionales', source: 'external' },
  { nombre: 'Vinculación con el Medio', source: 'external' },
  { nombre: 'Fondos Externos', source: 'external' },
];

export const PORTAL_AVANCES_DEFAULT_FONDO = PORTAL_AVANCES_FONDOS[0]!.nombre;

export function portalAvancesAppFondoNames(): string[] {
  return PORTAL_AVANCES_FONDOS.filter((f) => f.source === 'app').map(
    (f) => f.nombre,
  );
}

export function portalAvancesFondoByNombre(
  nombre: string,
): PortalAvancesFondo | undefined {
  return PORTAL_AVANCES_FONDOS.find((f) => f.nombre === nombre);
}

export function portalAvancesIsAppFondo(nombre: string): boolean {
  return portalAvancesFondoByNombre(nombre)?.source === 'app';
}

export function portalAvancesIsExcelFondo(nombre: string): boolean {
  return portalAvancesFondoByNombre(nombre)?.source === 'excel';
}

export type PortalAvancesFilters = Pick<
  VitrinaProjectFilters,
  'sedes' | 'escuelas'
>;

export const EMPTY_PORTAL_AVANCES_FILTERS: PortalAvancesFilters = {
  sedes: [],
  escuelas: [],
};

export type PortalAvancesProyecto = FondoAvanceMetrics & {
  id: string;
  fondo: string;
  proyecto: string;
  sede: string;
  escuelas: string[];
  idVinculamos?: string;
  estudiantes?: number | null;
  docentes?: number | null;
  beneficiarios?: number | null;
  honorariosNoAplica?: boolean;
};

export function sortEscuelaNames(nombres: string[]): string[] {
  return [...new Set(nombres.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

export function formatPortalAvancesEscuelas(nombres: string[]): string {
  return sortEscuelaNames(nombres).join(', ');
}

export function rowsForPortalAvancesFondo(
  proyectos: PortalAvancesProyecto[],
  fondoNombre: string,
): PortalAvancesProyecto[] {
  const fondo = portalAvancesFondoByNombre(fondoNombre);
  if (!fondo || fondo.source === 'external') return [];
  return proyectos.filter((p) => p.fondo === fondoNombre);
}

function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function portalAvancesMatchesQuery(
  proyecto: PortalAvancesProyecto,
  query: string,
): boolean {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = foldText(
    [
      proyecto.proyecto,
      proyecto.sede,
      ...proyecto.escuelas,
      proyecto.idVinculamos ?? '',
    ].join(' '),
  );
  return tokens.every((token) => haystack.includes(token));
}

function matchesFacet(values: string[], selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

export function filterPortalAvancesRows(
  proyectos: PortalAvancesProyecto[],
  filters: PortalAvancesFilters,
  query = '',
): PortalAvancesProyecto[] {
  return proyectos.filter(
    (proyecto) =>
      matchesFacet([proyecto.sede], filters.sedes) &&
      matchesFacet(proyecto.escuelas, filters.escuelas) &&
      portalAvancesMatchesQuery(proyecto, query),
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

export function uniquePortalAvancesFilterOptions(
  proyectos: PortalAvancesProyecto[],
): VitrinaProjectFilters {
  return {
    fondos: [],
    sedes: uniqueSorted(proyectos.map((p) => p.sede)),
    escuelas: uniqueSorted(proyectos.flatMap((p) => p.escuelas)),
    etiquetas: [],
  };
}

export function avancesFiltersToVitrina(
  filters: PortalAvancesFilters,
): VitrinaProjectFilters {
  return {
    fondos: [],
    sedes: filters.sedes,
    escuelas: filters.escuelas,
    etiquetas: [],
  };
}

export function canLoadPortalAvances(
  level: PortalGuestLevel | null,
  kind: PortalAccessKind | null = 'guest',
): boolean {
  if (kind === 'session' && level === 0) return false;
  return portalCanSeeView(level, 'avances');
}

export function portalAvancesFondosForLevel(
  level: PortalGuestLevel | null,
): readonly PortalAvancesFondo[] {
  if (level === 0) {
    return PORTAL_AVANCES_FONDOS.filter((fondo) => fondo.source === 'excel');
  }
  return PORTAL_AVANCES_FONDOS;
}

export function portalAvancesDefaultFondoForLevel(
  level: PortalGuestLevel | null,
): string {
  return (
    portalAvancesFondosForLevel(level)[0]?.nombre ?? PORTAL_AVANCES_DEFAULT_FONDO
  );
}

export function portalAvancesCanLoadAppFondos(
  level: PortalGuestLevel | null,
  kind: PortalAccessKind | null = 'guest',
): boolean {
  return canLoadPortalAvances(level, kind) && level !== 0;
}
