import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { formatIgip, type VitrinaIgipTarget } from '@/lib/vitrina-igip-scatter';
import {
  layoutVitrinaTrlSankey,
  type VitrinaTrlSankey,
  type VitrinaTrlSankeyLayout,
} from '@/lib/vitrina-trl-sankey';

export const IGIP_BIN_STEP = 0.25;

export type VitrinaIgipSankey = VitrinaTrlSankey;
export type VitrinaIgipSankeyLayout = VitrinaTrlSankeyLayout;

function targetValue(
  proyecto: VitrinaProyecto,
  target: VitrinaIgipTarget,
): number | null {
  return target === 'proyeccion' ? proyecto.igipProyeccion : proyecto.igipFinal;
}

/** Inicio del tramo de 0.25 que contiene el valor (p. ej. 1.6 → 1.5). */
export function igipBinStart(value: number): number {
  return Number(
    (Math.floor(value / IGIP_BIN_STEP + 1e-9) * IGIP_BIN_STEP).toFixed(4),
  );
}

/** Etiqueta del tramo, p. ej. 1.5 → "1.5-1.75". */
export function formatIgipBin(start: number): string {
  const end = Number((start + IGIP_BIN_STEP).toFixed(4));
  return `${formatIgip(start)}-${formatIgip(end)}`;
}

export function buildVitrinaIgipSankey(
  proyectos: VitrinaProyecto[],
  target: VitrinaIgipTarget,
): VitrinaIgipSankey {
  const linkCounts = new Map<
    string,
    { from: number; to: number; value: number; nombres: string[] }
  >();
  const fromCounts = new Map<number, number>();
  const toCounts = new Map<number, number>();
  let included = 0;
  let omitted = 0;

  for (const proyecto of proyectos) {
    const fromRaw = proyecto.igipInicial;
    const toRaw = targetValue(proyecto, target);
    if (fromRaw === null || toRaw === null) {
      omitted += 1;
      continue;
    }
    included += 1;
    const from = igipBinStart(fromRaw);
    const to = igipBinStart(toRaw);
    fromCounts.set(from, (fromCounts.get(from) ?? 0) + 1);
    toCounts.set(to, (toCounts.get(to) ?? 0) + 1);
    const key = `${from}:${to}`;
    const current = linkCounts.get(key);
    if (current) {
      current.value += 1;
      current.nombres.push(proyecto.nombre);
    } else {
      linkCounts.set(key, {
        from,
        to,
        value: 1,
        nombres: [proyecto.nombre],
      });
    }
  }

  const sortLevels = (counts: Map<number, number>) =>
    [...counts.entries()]
      .map(([level, value]) => ({ level, value }))
      .sort((a, b) => a.level - b.level);

  const links = [...linkCounts.values()]
    .map((link) => ({
      ...link,
      nombres: [...link.nombres].sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      return a.to - b.to;
    });

  return {
    included,
    omitted,
    fromLevels: sortLevels(fromCounts),
    toLevels: sortLevels(toCounts),
    links,
  };
}

export function layoutVitrinaIgipSankey(
  sankey: VitrinaIgipSankey,
  size: { width: number; height: number },
): VitrinaIgipSankeyLayout {
  // Etiquetas tipo "1.5-1.75" necesitan más margen que "TRL 9".
  return layoutVitrinaTrlSankey(sankey, size, { marginX: 110 });
}
