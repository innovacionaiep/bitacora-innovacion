import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  IGIP_SCORE_MAX,
  IGIP_SCORE_MIN,
  isIgipScore,
  type IgipSubdimensionKey,
} from '@/lib/igip-trl';
import { igipScoreField } from '@/lib/vitrina-igip-scores';

export type VitrinaIgipTarget = 'proyeccion' | 'final';

export type VitrinaIgipMetric = 'igip' | IgipSubdimensionKey;

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

function targetIndex(
  proyecto: VitrinaProyecto,
  target: VitrinaIgipTarget,
): number | null {
  return target === 'proyeccion' ? proyecto.igipProyeccion : proyecto.igipFinal;
}

function scoreValue(
  proyecto: VitrinaProyecto,
  stadium: 'inicial' | 'proyeccion' | 'final',
  key: IgipSubdimensionKey,
): number | null {
  const raw = proyecto[igipScoreField(stadium, key)];
  return typeof raw === 'number' && isIgipScore(raw) ? raw : null;
}

export function igipMetricPair(
  proyecto: VitrinaProyecto,
  target: VitrinaIgipTarget,
  metric: VitrinaIgipMetric = 'igip',
): { from: number | null; to: number | null } {
  if (metric === 'igip') {
    return { from: proyecto.igipInicial, to: targetIndex(proyecto, target) };
  }
  const toStadium = target === 'final' ? 'final' : 'proyeccion';
  return {
    from: scoreValue(proyecto, 'inicial', metric),
    to: scoreValue(proyecto, toStadium, metric),
  };
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
  metric: VitrinaIgipMetric = 'igip',
): VitrinaIgipScatter {
  const pairs: VitrinaIgipScatterPair[] = [];
  let omitted = 0;

  for (const proyecto of proyectos) {
    const { from, to } = igipMetricPair(proyecto, target, metric);
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

export function igipScoreAxisDomain(): {
  min: number;
  max: number;
  ticks: number[];
} {
  const ticks: number[] = [];
  for (let n = IGIP_SCORE_MIN; n <= IGIP_SCORE_MAX; n += 1) {
    ticks.push(n);
  }
  return { min: IGIP_SCORE_MIN, max: IGIP_SCORE_MAX, ticks };
}

export const IGIP_ROW_HEIGHT = 40;

export function layoutVitrinaIgipScatter(
  scatter: VitrinaIgipScatter,
  size: { width: number; height?: number },
  axis: 'igip' | 'score' = 'igip',
): VitrinaIgipScatterLayout {
  const values = scatter.pairs.flatMap((pair) => [pair.from, pair.to]);
  const rawMin = values.length === 0 ? 0 : Math.min(...values);
  const rawMax = values.length === 0 ? 1 : Math.max(...values);
  const domain =
    axis === 'score' ? igipScoreAxisDomain() : igipAxisDomain(rawMin, rawMax);
  const left = 0;
  const width = Math.max(1, size.width);
  const span = domain.max - domain.min || 1;
  const xFor = (value: number) => left + ((value - domain.min) / span) * width;

  const points = scatter.pairs.map((pair, index) => ({
    ...pair,
    y: index * IGIP_ROW_HEIGHT + IGIP_ROW_HEIGHT / 2,
    xFrom: xFor(pair.from),
    xTo: xFor(pair.to),
  }));

  return {
    points,
    min: domain.min,
    max: domain.max,
    ticks: domain.ticks,
    plot: { left, width },
    height: Math.max(IGIP_ROW_HEIGHT, scatter.pairs.length * IGIP_ROW_HEIGHT),
  };
}
