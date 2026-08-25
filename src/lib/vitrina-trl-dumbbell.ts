import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import type { VitrinaTrlTarget } from '@/lib/vitrina-trl-sankey';

export type VitrinaTrlSortBy =
  | 'nombre'
  | 'inicial'
  | 'destino'
  | 'variacion';

export type VitrinaTrlDumbbellPair = {
  id: string;
  nombre: string;
  from: number;
  to: number;
};

export type VitrinaTrlDumbbell = {
  included: number;
  omitted: number;
  pairs: VitrinaTrlDumbbellPair[];
};

export type VitrinaTrlDumbbellPoint = VitrinaTrlDumbbellPair & {
  y: number;
  xFrom: number;
  xTo: number;
};

export type VitrinaTrlDumbbellLayout = {
  points: VitrinaTrlDumbbellPoint[];
  min: number;
  max: number;
  ticks: number[];
  plot: { left: number; width: number };
  height: number;
};

function targetValue(
  proyecto: VitrinaProyecto,
  target: VitrinaTrlTarget,
): number | null {
  return target === 'proyeccion' ? proyecto.trlProyeccion : proyecto.trlFinal;
}

function comparePairs(
  a: VitrinaTrlDumbbellPair,
  b: VitrinaTrlDumbbellPair,
  sortBy: VitrinaTrlSortBy,
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

export function buildVitrinaTrlDumbbell(
  proyectos: VitrinaProyecto[],
  target: VitrinaTrlTarget,
  sortBy: VitrinaTrlSortBy = 'variacion',
): VitrinaTrlDumbbell {
  const pairs: VitrinaTrlDumbbellPair[] = [];
  let omitted = 0;

  for (const proyecto of proyectos) {
    const from = proyecto.trlInicial;
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
  return { included: pairs.length, omitted, pairs };
}

export const TRL_ROW_HEIGHT = 40;

export function trlAxisDomain(
  min: number,
  max: number,
): { min: number; max: number; ticks: number[] } {
  const lo = Math.floor(min);
  let hi = Math.ceil(max);
  if (hi <= lo) hi = lo + 1;
  const ticks: number[] = [];
  for (let i = lo; i <= hi; i += 1) ticks.push(i);
  return { min: ticks[0] ?? lo, max: ticks[ticks.length - 1] ?? hi, ticks };
}

export function layoutVitrinaTrlDumbbell(
  dumbbell: VitrinaTrlDumbbell,
  size: { width: number },
): VitrinaTrlDumbbellLayout {
  const values = dumbbell.pairs.flatMap((pair) => [pair.from, pair.to]);
  const rawMin = values.length === 0 ? 1 : Math.min(...values);
  const rawMax = values.length === 0 ? 9 : Math.max(...values);
  const axis = trlAxisDomain(rawMin, rawMax);
  const left = 0;
  const width = Math.max(1, size.width);
  const span = axis.max - axis.min || 1;
  const xFor = (value: number) => left + ((value - axis.min) / span) * width;

  const points = dumbbell.pairs.map((pair, index) => ({
    ...pair,
    y: index * TRL_ROW_HEIGHT + TRL_ROW_HEIGHT / 2,
    xFrom: xFor(pair.from),
    xTo: xFor(pair.to),
  }));

  return {
    points,
    min: axis.min,
    max: axis.max,
    ticks: axis.ticks,
    plot: { left, width },
    height: Math.max(TRL_ROW_HEIGHT, dumbbell.pairs.length * TRL_ROW_HEIGHT),
  };
}

export function formatTrlDelta(from: number, to: number): string {
  const delta = to - from;
  if (delta === 0) return 'sin cambio';
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;
}
