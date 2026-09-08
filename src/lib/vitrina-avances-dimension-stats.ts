import { expandPortalAvancesCommaItems } from '@/lib/portal-avances';
import type {
  PortalAvancesFondo,
  PortalAvancesProyecto,
} from '@/lib/portal-avances';
import { allowedPortalAvancesAnalisisFondos } from '@/lib/vitrina-avances-participantes';
import {
  foldCarreraMatchKey,
  formatCarreraTitulo,
  pickPreferredCarreraSource,
} from '@/lib/vitrina-carrera-titulo';
import type { VitrinaDataBarDatum } from '@/lib/vitrina-data-stats';

function countAvancesDimension(
  proyectos: PortalAvancesProyecto[],
  allowedFondos: Set<string>,
  pick: (proyecto: PortalAvancesProyecto) => string[],
  formatLabel: (raw: string) => string,
): VitrinaDataBarDatum[] {
  const groups = new Map<
    string,
    { sources: string[]; nombres: Set<string> }
  >();

  for (const proyecto of proyectos) {
    if (!allowedFondos.has(proyecto.fondo)) continue;
    const seen = new Set<string>();
    for (const raw of expandPortalAvancesCommaItems(pick(proyecto))) {
      const key = foldCarreraMatchKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) ?? { sources: [], nombres: new Set() };
      group.sources.push(raw);
      group.nombres.add(proyecto.proyecto);
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .map((group) => {
      const label = formatLabel(pickPreferredCarreraSource(group.sources));
      return {
        label,
        value: group.nombres.size,
        nombres: [...group.nombres].sort((a, b) => a.localeCompare(b, 'es')),
      };
    })
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.label.localeCompare(b.label, 'es');
    });
}

export function buildVitrinaAvancesCarreraStats(
  proyectos: PortalAvancesProyecto[],
  enabledFondos: readonly PortalAvancesFondo[],
  selectedFondoNombres: readonly string[] = [],
): VitrinaDataBarDatum[] {
  return countAvancesDimension(
    proyectos,
    allowedPortalAvancesAnalisisFondos(
      enabledFondos,
      selectedFondoNombres,
      'carreras',
    ),
    (proyecto) => proyecto.carreras ?? [],
    formatCarreraTitulo,
  );
}

export function buildVitrinaAvancesAsignaturaStats(
  proyectos: PortalAvancesProyecto[],
  enabledFondos: readonly PortalAvancesFondo[],
  selectedFondoNombres: readonly string[] = [],
): VitrinaDataBarDatum[] {
  return countAvancesDimension(
    proyectos,
    allowedPortalAvancesAnalisisFondos(
      enabledFondos,
      selectedFondoNombres,
      'asignaturas',
    ),
    (proyecto) => proyecto.asignaturas ?? [],
    (raw) => raw.trim().replace(/\s+/g, ' '),
  );
}

export type VitrinaAvancesAsignaturaCobertura = {
  total: number;
  conAsignatura: number;
  sinAsignatura: number;
  conPct: number;
  sinPct: number;
  nombresCon: string[];
  nombresSin: string[];
};

function roundPct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function proyectoTieneAsignatura(proyecto: PortalAvancesProyecto): boolean {
  return expandPortalAvancesCommaItems(proyecto.asignaturas ?? []).length > 0;
}

export function buildVitrinaAvancesAsignaturaCobertura(
  proyectos: PortalAvancesProyecto[],
  enabledFondos: readonly PortalAvancesFondo[],
  selectedFondoNombres: readonly string[] = [],
): VitrinaAvancesAsignaturaCobertura {
  const allowedFondos = allowedPortalAvancesAnalisisFondos(
    enabledFondos,
    selectedFondoNombres,
    'asignaturas',
  );
  const nombresCon = new Set<string>();
  const nombresSin = new Set<string>();
  const seen = new Set<string>();
  let conAsignatura = 0;
  let sinAsignatura = 0;

  for (const proyecto of proyectos) {
    if (!allowedFondos.has(proyecto.fondo)) continue;
    if (seen.has(proyecto.id)) continue;
    seen.add(proyecto.id);
    const nombre = proyecto.proyecto.trim() || proyecto.id;
    if (proyectoTieneAsignatura(proyecto)) {
      conAsignatura += 1;
      nombresCon.add(nombre);
    } else {
      sinAsignatura += 1;
      nombresSin.add(nombre);
    }
  }

  const total = conAsignatura + sinAsignatura;
  const conPct = roundPct(conAsignatura, total);
  const sinPct = total === 0 ? 0 : Math.round((100 - conPct) * 10) / 10;

  return {
    total,
    conAsignatura,
    sinAsignatura,
    conPct,
    sinPct,
    nombresCon: [...nombresCon].sort((a, b) => a.localeCompare(b, 'es')),
    nombresSin: [...nombresSin].sort((a, b) => a.localeCompare(b, 'es')),
  };
}
