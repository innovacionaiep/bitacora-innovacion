import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaIgipTarget = 'proyeccion' | 'final';

export type VitrinaIgipSortBy =
  | 'nombre'
  | 'inicial'
  | 'destino'
  | 'variacion';

export type VitrinaIgipScatterPair = {
  id: string;
  nombre: string;
  from: number;
  to: number;
};

export type VitrinaIgipScatter = {
  included: number;
  omitted: number;
  pairs: VitrinaIgipScatterPair[];
};

export type VitrinaIgipScatterPoint = VitrinaIgipScatterPair & {
  y: number;
  xFrom: number;
  xTo: number;
};

export type VitrinaIgipScatterLayout = {
  points: VitrinaIgipScatterPoint[];
  min: number;
  max: number;
  ticks: number[];
  plot: { left: number; width: number };
  height: number;
};

function targetValue(
  proyecto: VitrinaProyecto,
  target: VitrinaIgipTarget,
): number | null {
  return target === 'proyeccion' ? proyecto.igipProyeccion : proyecto.igipFinal;
}

export function formatIgip(value: number): string {
  return String(Number(value.toFixed(4)));
}

export function formatIgipDelta(from: number, to: number): string {
  const delta = Number((to - from).toFixed(4));
  if (delta === 0) return 'sin cambio';
  const formatted = formatIgip(Math.abs(delta));
  return delta > 0 ? `+${formatted}` : `−${formatted}`;
}

function comparePairs(
  a: VitrinaIgipScatterPair,
  b: VitrinaIgipScatterPair,
  sortBy: VitrinaIgipSortBy,
): number {
  if (sortBy === 'nombre') {
    const byName = a.nombre.localeCompare(b.nombre, 'es');
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  }
  if (sortBy === 'inicial') {
    const byFrom = b.from - a.from;
    if (byFrom !== 0) return byFrom;
  } else if (sortBy === 'destino') {
    const byTo = b.to - a.to;
    if (byTo !== 0) return byTo;
  } else {
    const byDelta = b.to - b.from - (a.to - a.from);
    if (byDelta !== 0) return byDelta;
  }
  const byName = a.nombre.localeCompare(b.nombre, 'es');
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

export function buildVitrinaIgipScatter(
  proyectos: VitrinaProyecto[],
  target: VitrinaIgipTarget,
  sortBy: VitrinaIgipSortBy = 'variacion',
): VitrinaIgipScatter {
  const pairs: VitrinaIgipScatterPair[] = [];
  let omitted = 0;

  for (const proyecto of proyectos) {
    const from = proyecto.igipInicial;
    const to = targetValue(proyecto, target);
    if (from === null || to === null) {
      omitted += 1;
      continue;
    }
    pairs.push({
      id: proyecto.id,
      nombre: proyecto.nombre,
      from,
      to,
    });
  }

  pairs.sort((a, b) => comparePairs(a, b, sortBy));

  const included = pairs.length;

  return { included, omitted, pairs };
}

export const IGIP_TICK_STEP = 0.25;

export function igipAxisDomain(
  min: number,
  max: number,
): { min: number; max: number; ticks: number[] } {
  const step = IGIP_TICK_STEP;
  const snap = (value: number, mode: 'floor' | 'ceil') => {
    const units = value / step;
    const n = mode === 'floor' ? Math.floor(units + 1e-9) : Math.ceil(units - 1e-9);
    return Number((n * step).toFixed(4));
  };
  let lo = snap(min, 'floor');
  let hi = snap(max, 'ceil');
  if (hi <= lo) hi = Number((lo + step).toFixed(4));
  const ticks: number[] = [];
  const start = Math.round(lo / step);
  const end = Math.round(hi / step);
  for (let i = start; i <= end; i += 1) {
    ticks.push(Number((i * step).toFixed(4)));
  }
  return { min: ticks[0] ?? lo, max: ticks[ticks.length - 1] ?? hi, ticks };
}

export const IGIP_ROW_HEIGHT = 40;

export function layoutVitrinaIgipScatter(
  scatter: VitrinaIgipScatter,
  size: { width: number; height?: number },
): VitrinaIgipScatterLayout {
  const values = scatter.pairs.flatMap((pair) => [pair.from, pair.to]);
  const rawMin = values.length === 0 ? 0 : Math.min(...values);
  const rawMax = values.length === 0 ? 1 : Math.max(...values);
  const axis = igipAxisDomain(rawMin, rawMax);
  const left = 0;
  const width = Math.max(1, size.width);
  const span = axis.max - axis.min || 1;
  const xFor = (value: number) => left + ((value - axis.min) / span) * width;

  const points = scatter.pairs.map((pair, index) => ({
    ...pair,
    y: index * IGIP_ROW_HEIGHT + IGIP_ROW_HEIGHT / 2,
    xFrom: xFor(pair.from),
    xTo: xFor(pair.to),
  }));

  return {
    points,
    min: axis.min,
    max: axis.max,
    ticks: axis.ticks,
    plot: { left, width },
    height: Math.max(IGIP_ROW_HEIGHT, scatter.pairs.length * IGIP_ROW_HEIGHT),
  };
}
