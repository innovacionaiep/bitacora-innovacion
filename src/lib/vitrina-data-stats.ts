import { isExcludedVitrinaFondo } from '@/lib/vitrina-project-filters';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaLineaFondoCatalog = {
  fondos: Array<{ id: string; nombre: string }>;
  lineas: Array<{ nombre: string; fondoId: string }>;
};

export type VitrinaDataBarDatum = {
  label: string;
  value: number;
  nombres: string[];
  /** Fondo padre (solo series de línea). */
  parentFondo?: string;
};

export type VitrinaDataStats = {
  total: number;
  porFondo: VitrinaDataBarDatum[];
  porLinea: VitrinaDataBarDatum[];
  porSede: VitrinaDataBarDatum[];
  porEscuela: VitrinaDataBarDatum[];
  porEtiqueta: VitrinaDataBarDatum[];
};

function countByName(
  proyectos: VitrinaProyecto[],
  pick: (proyecto: VitrinaProyecto) => string[],
  exclude?: (name: string) => boolean,
): VitrinaDataBarDatum[] {
  const counts = new Map<string, string[]>();
  for (const proyecto of proyectos) {
    const seen = new Set<string>();
    for (const raw of pick(proyecto)) {
      const label = raw.trim();
      if (!label || exclude?.(label) || seen.has(label)) continue;
      seen.add(label);
      const nombres = counts.get(label) ?? [];
      nombres.push(proyecto.nombre);
      counts.set(label, nombres);
    }
  }
  return [...counts.entries()]
    .map(([label, nombres]) => ({
      label,
      value: nombres.length,
      nombres: [...nombres].sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.label.localeCompare(b.label, 'es');
    });
}

function pickVotedFondo(votes: Map<string, number>): string | undefined {
  let best: { fondo: string; n: number } | undefined;
  for (const [fondo, n] of votes) {
    if (
      !best ||
      n > best.n ||
      (n === best.n && fondo.localeCompare(best.fondo, 'es') < 0)
    ) {
      best = { fondo, n };
    }
  }
  return best?.fondo;
}

function lineaParentFromCatalog(
  catalog: VitrinaLineaFondoCatalog | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!catalog) return map;
  const fondoById = new Map(
    catalog.fondos.map((fondo) => [fondo.id, fondo.nombre]),
  );
  for (const linea of catalog.lineas) {
    const nombre = linea.nombre.trim();
    const fondoNombre = fondoById.get(linea.fondoId)?.trim();
    if (!nombre || !fondoNombre || map.has(nombre)) continue;
    map.set(nombre, fondoNombre);
  }
  return map;
}

function countLineas(
  proyectos: VitrinaProyecto[],
  catalog?: VitrinaLineaFondoCatalog,
): VitrinaDataBarDatum[] {
  const counts = new Map<string, string[]>();
  const fondoVotes = new Map<string, Map<string, number>>();
  const catalogParent = lineaParentFromCatalog(catalog);

  for (const proyecto of proyectos) {
    const seen = new Set<string>();
    for (const raw of proyecto.lineas) {
      const label = raw.trim();
      if (!label || seen.has(label)) continue;
      seen.add(label);
      const nombres = counts.get(label) ?? [];
      nombres.push(proyecto.nombre);
      counts.set(label, nombres);

      const votes = fondoVotes.get(label) ?? new Map<string, number>();
      for (const fondoRaw of proyecto.fondos) {
        const fondo = fondoRaw.trim();
        if (!fondo || isExcludedVitrinaFondo(fondo)) continue;
        votes.set(fondo, (votes.get(fondo) ?? 0) + 1);
      }
      fondoVotes.set(label, votes);
    }
  }

  return [...counts.entries()]
    .map(([label, nombres]) => {
      const parentFondo =
        catalogParent.get(label) ?? pickVotedFondo(fondoVotes.get(label) ?? new Map());
      return {
        label,
        value: nombres.length,
        nombres: [...nombres].sort((a, b) => a.localeCompare(b, 'es')),
        ...(parentFondo ? { parentFondo } : {}),
      };
    })
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.label.localeCompare(b.label, 'es');
    });
}

export function buildVitrinaDataStats(
  proyectos: VitrinaProyecto[],
  catalog?: VitrinaLineaFondoCatalog,
): VitrinaDataStats {
  return {
    total: proyectos.length,
    porFondo: countByName(proyectos, (p) => p.fondos, isExcludedVitrinaFondo),
    porLinea: countLineas(proyectos, catalog),
    porSede: countByName(proyectos, (p) => p.sedes),
    porEscuela: countByName(proyectos, (p) => p.escuelas),
    porEtiqueta: countByName(proyectos, (p) => p.etiquetas),
  };
}

export function countVitrinaSociosComunitarios(
  proyectos: VitrinaProyecto[],
): number {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const proyecto of proyectos) {
    const socioIds = proyecto.socioIds.map((id) => id.trim()).filter(Boolean);
    if (socioIds.length > 0) {
      for (const id of socioIds) ids.add(id);
      continue;
    }
    for (const nombre of proyecto.socios) {
      const key = nombre.trim();
      if (key) names.add(key);
    }
  }
  return ids.size + names.size;
}
