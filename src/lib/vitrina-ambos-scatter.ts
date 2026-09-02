import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { igipAxisDomain, type VitrinaIgipTarget } from '@/lib/vitrina-igip-scatter';
import { trlAxisDomain } from '@/lib/vitrina-trl-dumbbell';

export type VitrinaAmbosTarget = VitrinaIgipTarget | 'inicial';
export type VitrinaAmbosKind = 'inicial' | 'destino';

export type VitrinaAmbosScatterDatum = {
  id: string;
  proyectoId: string;
  nombre: string;
  kind: VitrinaAmbosKind;
  fondo: string;
  trl: number;
  igip: number;
};

export type VitrinaAmbosScatter = {
  included: number;
  omitted: number;
  points: VitrinaAmbosScatterDatum[];
};

export type VitrinaAmbosScatterPoint = VitrinaAmbosScatterDatum & {
  x: number;
  y: number;
};

export const AMBOS_STACK_RADIUS = 3.5;
export const AMBOS_INICIAL_FILL_OPACITY = 1;
export const AMBOS_DESTINO_FILL_OPACITY = 0.25;
export const AMBOS_DESTINO_IMPULSA_FILL_OPACITY = 0.35;

function isImpulsaFondo(fondo: string): boolean {
  return fondo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes('impulsa');
}

export function vitrinaAmbosFillOpacity(
  kind: VitrinaAmbosKind,
  fondo = '',
): number {
  if (kind === 'inicial') return AMBOS_INICIAL_FILL_OPACITY;
  return isImpulsaFondo(fondo)
    ? AMBOS_DESTINO_IMPULSA_FILL_OPACITY
    : AMBOS_DESTINO_FILL_OPACITY;
}

function pointGroupKey(trl: number, igip: number): string {
  return `${trl}:${igip}`;
}

/** Separa levemente círculos que comparten TRL+IGIP, sin importar el estadio. */
export function jitterOverlappingAmbosPoints(
  points: VitrinaAmbosScatterPoint[],
): VitrinaAmbosScatterPoint[] {
  const groups = new Map<string, VitrinaAmbosScatterPoint[]>();
  for (const point of points) {
    const key = pointGroupKey(point.trl, point.igip);
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const n = group.length;
    group.forEach((point, index) => {
      const angle = (Math.PI * 2 * index) / n;
      point.x += Math.cos(angle) * AMBOS_STACK_RADIUS;
      point.y += Math.sin(angle) * AMBOS_STACK_RADIUS;
    });
  }

  return points;
}

export function namesAtAmbosPoint(
  points: VitrinaAmbosScatterDatum[],
  kind: VitrinaAmbosKind,
  trl: number,
  igip: number,
): string[] {
  return points
    .filter(
      (point) =>
        point.kind === kind && point.trl === trl && point.igip === igip,
    )
    .map((point) => point.nombre)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export type VitrinaAmbosScatterLayout = {
  points: VitrinaAmbosScatterPoint[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks: number[];
  yTicks: number[];
  plot: { left: number; top: number; width: number; height: number };
};

function targetTrl(
  proyecto: VitrinaProyecto,
  target: VitrinaAmbosTarget,
): number | null {
  if (target === 'inicial') return null;
  return target === 'proyeccion' ? proyecto.trlProyeccion : proyecto.trlFinal;
}

function targetIgip(
  proyecto: VitrinaProyecto,
  target: VitrinaAmbosTarget,
): number | null {
  if (target === 'inicial') return null;
  return target === 'proyeccion' ? proyecto.igipProyeccion : proyecto.igipFinal;
}

export function buildVitrinaAmbosScatter(
  proyectos: VitrinaProyecto[],
  target: VitrinaAmbosTarget,
): VitrinaAmbosScatter {
  const points: VitrinaAmbosScatterDatum[] = [];
  let included = 0;
  let omitted = 0;

  for (const proyecto of proyectos) {
    const inicialOk =
      proyecto.trlInicial !== null && proyecto.igipInicial !== null;
    const destTrl = targetTrl(proyecto, target);
    const destIgip = targetIgip(proyecto, target);
    const destinoOk = destTrl !== null && destIgip !== null;

    if (!inicialOk && !destinoOk) {
      omitted += 1;
      continue;
    }

    included += 1;
    const fondo = proyecto.fondos.join(' · ');
    if (inicialOk) {
      points.push({
        id: `${proyecto.id}:inicial`,
        proyectoId: proyecto.id,
        nombre: proyecto.nombre,
        kind: 'inicial',
        fondo,
        trl: proyecto.trlInicial as number,
        igip: proyecto.igipInicial as number,
      });
    }
    if (destinoOk) {
      points.push({
        id: `${proyecto.id}:destino`,
        proyectoId: proyecto.id,
        nombre: proyecto.nombre,
        kind: 'destino',
        fondo,
        trl: destTrl,
        igip: destIgip,
      });
    }
  }

  return { included, omitted, points };
}

export function layoutVitrinaAmbosScatter(
  scatter: VitrinaAmbosScatter,
  size: { width: number; height: number },
): VitrinaAmbosScatterLayout {
  const left = 58;
  const right = 24;
  const top = 20;
  const bottom = 58;
  const plotWidth = Math.max(1, size.width - left - right);
  const plotHeight = Math.max(1, size.height - top - bottom);

  const trls = scatter.points.map((p) => p.trl);
  const igips = scatter.points.map((p) => p.igip);
  const trlAxis = trlAxisDomain(
    trls.length === 0 ? 1 : Math.min(...trls),
    trls.length === 0 ? 9 : Math.max(...trls),
  );
  const igipAxis = igipAxisDomain(
    igips.length === 0 ? 0 : Math.min(...igips),
    igips.length === 0 ? 1 : Math.max(...igips),
  );

  const xSpan = trlAxis.max - trlAxis.min || 1;
  const ySpan = igipAxis.max - igipAxis.min || 1;
  const xFor = (trl: number) => left + ((trl - trlAxis.min) / xSpan) * plotWidth;
  const yFor = (igip: number) =>
    top + plotHeight - ((igip - igipAxis.min) / ySpan) * plotHeight;

  const points = jitterOverlappingAmbosPoints(
    scatter.points.map((point) => ({
      ...point,
      x: xFor(point.trl),
      y: yFor(point.igip),
    })),
  );

  return {
    points,
    xMin: trlAxis.min,
    xMax: trlAxis.max,
    yMin: igipAxis.min,
    yMax: igipAxis.max,
    xTicks: trlAxis.ticks,
    yTicks: igipAxis.ticks,
    plot: { left, top, width: plotWidth, height: plotHeight },
  };
}

export type VitrinaAmbosLabelAnchor = {
  id: string;
  nombre: string;
  /** Coordenada X del ancla (borde derecho del texto, a la izquierda del punto). */
  x: number;
  y: number;
};

export type VitrinaAmbosLabel = VitrinaAmbosLabelAnchor & {
  label: string;
  width: number;
  height: number;
};

const LABEL_FONT_SIZE = 8;
const LABEL_CHAR_WIDTH = 4.6;
const LABEL_HEIGHT = 10;
export const AMBOS_LABEL_MAX_LEN = 30;
const LABEL_PAD = 3;
/** Separación entre el borde derecho del nombre y el centro del punto destino. */
export const AMBOS_LABEL_GAP = 10;

function truncateLabel(nombre: string): string {
  if (nombre.length <= AMBOS_LABEL_MAX_LEN) return nombre;
  return `${nombre.slice(0, AMBOS_LABEL_MAX_LEN - 1)}…`;
}

function labelWidth(label: string): number {
  return Math.max(12, label.length * LABEL_CHAR_WIDTH);
}

/** Bounding box con textAnchor=end: x es el borde derecho. */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const ax0 = a.x - a.width - LABEL_PAD;
  const ax1 = a.x + LABEL_PAD;
  const ay0 = a.y - a.height / 2 - LABEL_PAD;
  const ay1 = a.y + a.height / 2 + LABEL_PAD;
  const bx0 = b.x - b.width - LABEL_PAD;
  const bx1 = b.x + LABEL_PAD;
  const by0 = b.y - b.height / 2 - LABEL_PAD;
  const by1 = b.y + b.height / 2 + LABEL_PAD;
  return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
}

function clusterKey(x: number, y: number): string {
  return `${Math.round(x)}:${Math.round(y)}`;
}

/**
 * Coloca etiquetas a la izquierda del punto destino. Si varios proyectos
 * comparten el mismo punto, se apilan en columna (A–Z) para no ocultarse.
 */
export function layoutVitrinaAmbosLabels(
  anchors: VitrinaAmbosLabelAnchor[],
  bounds?: { left: number; top: number; width: number; height: number },
): VitrinaAmbosLabel[] {
  const labels: VitrinaAmbosLabel[] = anchors.map((anchor) => {
    const label = truncateLabel(anchor.nombre);
    return {
      ...anchor,
      label,
      width: labelWidth(label),
      height: LABEL_HEIGHT,
    };
  });

  const clusters = new Map<string, VitrinaAmbosLabel[]>();
  for (const item of labels) {
    const key = clusterKey(item.x, item.y);
    const group = clusters.get(key);
    if (group) group.push(item);
    else clusters.set(key, [item]);
  }

  const step = LABEL_HEIGHT + LABEL_PAD;
  for (const group of clusters.values()) {
    group.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const anchorY = group.reduce((sum, item) => sum + item.y, 0) / group.length;
    const anchorX = group[0]?.x ?? 0;
    group.forEach((item, index) => {
      item.x = anchorX;
      item.y = anchorY + (index - (group.length - 1) / 2) * step;
    });
  }

  const minX = bounds?.left ?? 0;
  const maxX = bounds ? bounds.left + bounds.width : Number.POSITIVE_INFINITY;

  const groups = [...clusters.values()];
  for (let pass = 0; pass < 40; pass += 1) {
    let moved = false;
    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        const ga = groups[i];
        const gb = groups[j];
        const collide = ga.some((a) => gb.some((b) => overlaps(a, b)));
        if (!collide) continue;
        moved = true;
        const midA = ga.reduce((sum, item) => sum + item.y, 0) / ga.length;
        const midB = gb.reduce((sum, item) => sum + item.y, 0) / gb.length;
        const dir = midA <= midB ? -step : step;
        for (const item of ga) item.y += dir;
        for (const item of gb) item.y -= dir;
      }
    }
    if (!moved) break;
  }

  for (const item of labels) {
    item.x = Math.min(maxX, Math.max(minX + item.width, item.x));
  }

  return labels;
}

export { LABEL_FONT_SIZE };
