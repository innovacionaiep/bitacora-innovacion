import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';
import {
  PORTAL_CAUSALAB_FONDO,
  portalCanSeeView,
  portalIsCausalab,
  type PortalAccessKind,
  type PortalGuestLevel,
  type PortalGuestProfile,
} from '@/lib/portal-guest-access';
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
  { nombre: 'Vinculación con el Medio', source: 'excel' },
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
  carreras?: string[];
  asignaturas?: string[];
  encargado?: string;
  idVinculamos?: string;
  estudiantes?: number | null;
  docentes?: number | null;
  beneficiarios?: number | null;
  honorariosNoAplica?: boolean;
  ganttNoAplica?: boolean;
  indicadoresNoAplica?: boolean;
  operativoSolicitadoNoAplica?: boolean;
  operativoEjecutadoNoAplica?: boolean;
};

export function sortEscuelaNames(nombres: string[]): string[] {
  return [...new Set(nombres.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
}

export function formatPortalAvancesEscuelas(nombres: string[]): string {
  return sortEscuelaNames(nombres).join('\n');
}

/** Parte ítems solo por `|` (las comas forman parte del nombre, p. ej. carreras). */
export function expandPortalAvancesCommaItems(nombres: string[]): string[] {
  return sortEscuelaNames(
    nombres.flatMap((nombre) =>
      nombre
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export function formatPortalAvancesCommaList(nombres: string[]): string {
  return expandPortalAvancesCommaItems(nombres).join('\n');
}

export function formatPortalAvancesSede(sede: string): string {
  if (!sede.trim()) return '';
  return sortEscuelaNames(
    sede
      .split(/[,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  ).join('\n');
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
      proyecto.encargado ?? '',
      proyecto.sede,
      ...proyecto.escuelas,
      ...(proyecto.carreras ?? []),
      ...(proyecto.asignaturas ?? []),
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
  profile: PortalGuestProfile | null = null,
  kind: PortalAccessKind | null = 'guest',
): readonly PortalAvancesFondo[] {
  if (portalIsCausalab({ kind: kind ?? 'guest', level, profile })) {
    return PORTAL_AVANCES_FONDOS.filter(
      (fondo) => fondo.nombre === PORTAL_CAUSALAB_FONDO,
    );
  }
  return PORTAL_AVANCES_FONDOS;
}

export function portalAvancesDefaultFondoForLevel(
  level: PortalGuestLevel | null,
  profile: PortalGuestProfile | null = null,
  kind: PortalAccessKind | null = 'guest',
): string {
  return (
    portalAvancesFondosForLevel(level, profile, kind)[0]?.nombre ??
    PORTAL_AVANCES_DEFAULT_FONDO
  );
}

export function portalAvancesLevelCanSeeFondo(
  level: PortalGuestLevel | null,
  fondoNombre: string,
  profile: PortalGuestProfile | null = null,
  kind: PortalAccessKind | null = 'guest',
): boolean {
  return portalAvancesFondosForLevel(level, profile, kind).some(
    (fondo) => fondo.nombre === fondoNombre,
  );
}

export function portalAvancesCanLoadAppFondos(
  level: PortalGuestLevel | null,
  kind: PortalAccessKind | null = 'guest',
  profile: PortalGuestProfile | null = null,
): boolean {
  return (
    canLoadPortalAvances(level, kind) &&
    !portalIsCausalab({ kind: kind ?? 'guest', level, profile })
  );
}

export type PortalAvancesParticipanteInput = {
  proyectoId: string;
  rol: string;
  cargo: string | null;
};

export type PortalAvancesParticipanteCounts = {
  estudiantes: number;
  docentes: number;
  beneficiarios: number;
};

function cargoIncludes(cargo: string | null, needle: string): boolean {
  return (cargo ?? '').toLowerCase().includes(needle.toLowerCase());
}

/**
 * Conteos de Avances (fondos app):
 * - Estudiantes: rol Estudiante, más otros roles (salvo Beneficiario) con
 *   "estudiante" en Cargo.
 * - Docentes: rol Docente, más otros roles (salvo Beneficiario) con
 *   "docente" en Cargo.
 * - Beneficiarios: solo rol Beneficiario.
 */
export function countPortalAvancesParticipantes(
  rows: PortalAvancesParticipanteInput[],
): Map<string, PortalAvancesParticipanteCounts> {
  const byProyecto = new Map<string, PortalAvancesParticipanteCounts>();
  const ensure = (proyectoId: string) => {
    let counts = byProyecto.get(proyectoId);
    if (!counts) {
      counts = { estudiantes: 0, docentes: 0, beneficiarios: 0 };
      byProyecto.set(proyectoId, counts);
    }
    return counts;
  };

  for (const row of rows) {
    const counts = ensure(row.proyectoId);
    if (row.rol === 'Beneficiario') {
      counts.beneficiarios += 1;
      continue;
    }
    if (row.rol === 'Estudiante' || cargoIncludes(row.cargo, 'estudiante')) {
      counts.estudiantes += 1;
    }
    if (row.rol === 'Docente' || cargoIncludes(row.cargo, 'docente')) {
      counts.docentes += 1;
    }
  }

  return byProyecto;
}
