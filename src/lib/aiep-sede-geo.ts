import {
  VITRINA_COVER_OFFSET_DEFAULT,
  VITRINA_COVER_ZOOM_DEFAULT,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';
import { projectChileLonLat } from '@/lib/chile-horizontal-paths';

export type AiepSedeGeoPoint = {
  id: string;
  label: string;
  regionId: number;
  address: string;
  lon: number;
  lat: number;
  x: number;
  y: number;
};

export type AiepSedePinProyecto = {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  coverOffsetX: number;
  coverOffsetY: number;
  coverZoom: number;
};

export type AiepSedePin = AiepSedeGeoPoint & {
  nombres: string[];
  proyectos: AiepSedePinProyecto[];
};

export type AiepRegionPin = {
  regionId: number;
  x: number;
  y: number;
  count: number;
};

function sedePoint(
  id: string,
  label: string,
  regionId: number,
  address: string,
  lon: number,
  lat: number,
): AiepSedeGeoPoint {
  const { x, y } = projectChileLonLat(lon, lat);
  return { id, label, regionId, address, lon, lat, x, y };
}

/** Direcciones oficiales AIEP (Wikipedia / aiep.cl) geocodificadas con OSM Nominatim. */
const POINTS: AiepSedeGeoPoint[] = [
  sedePoint(
    'calama',
    'Calama',
    2,
    'Avenida Balmaceda 3242, Calama',
    -68.9216709,
    -22.4483617,
  ),
  sedePoint(
    'antofagasta',
    'Antofagasta',
    2,
    'San Martín 2351, Antofagasta',
    -70.4003324,
    -23.6487817,
  ),
  sedePoint(
    'la-serena',
    'La Serena',
    4,
    'Huanhualí 105, La Serena',
    -71.2589349,
    -29.9147842,
  ),
  sedePoint(
    'vina-del-mar',
    'Viña del Mar',
    5,
    'Avenida Álvarez 860, Viña del Mar',
    -71.5498854,
    -33.0270986,
  ),
  sedePoint(
    'valparaiso',
    'Valparaíso',
    5,
    'Errázuriz 641, Valparaíso',
    -71.6272307,
    -33.0386342,
  ),
  sedePoint(
    'san-felipe',
    'San Felipe',
    5,
    'Yungay 1582, San Felipe',
    -70.7209553,
    -32.7562017,
  ),
  sedePoint(
    'san-antonio',
    'San Antonio',
    5,
    'Lautaro 1749, San Antonio',
    -71.6108823,
    -33.5986289,
  ),
  sedePoint(
    'santiago-norte',
    'Santiago Norte',
    13,
    'Avenida Américo Vespucio 1796, Conchalí',
    -70.6804917,
    -33.3679977,
  ),
  sedePoint(
    'bellavista',
    'Bellavista',
    13,
    'Bellavista 0121, Providencia',
    -70.6340696,
    -33.4348888,
  ),
  sedePoint(
    'barrio-universitario',
    'Barrio Universitario',
    13,
    'Ejército 49, Santiago',
    -70.6616901,
    -33.4475108,
  ),
  sedePoint(
    'san-joaquin',
    'San Joaquín',
    13,
    'Avenida Vicuña Mackenna 4685, San Joaquín',
    -70.6169058,
    -33.4970311,
  ),
  sedePoint(
    'maipu',
    'Maipú',
    13,
    'Chacabuco 40, Maipú',
    -70.7579522,
    -33.5092235,
  ),
  sedePoint(
    'san-bernardo',
    'San Bernardo',
    13,
    'San José 672, San Bernardo',
    -70.6889148,
    -33.601267,
  ),
  sedePoint(
    'rancagua',
    'Rancagua',
    6,
    'Cuevas 70, Rancagua',
    -70.7412203,
    -34.169063,
  ),
  sedePoint(
    'san-fernando',
    'San Fernando',
    6,
    'Carampangue 1058, San Fernando',
    -70.9885315,
    -34.5816262,
  ),
  sedePoint(
    'curico',
    'Curicó',
    7,
    "Bernardo O'Higgins 201, Curicó",
    -71.2073133,
    -34.9420669,
  ),
  sedePoint(
    'talca',
    'Talca',
    7,
    '6 Oriente 1380, Talca',
    -71.6649355,
    -35.4496156,
  ),
  sedePoint(
    'chillan',
    'Chillán',
    16,
    "Avenida Bernardo O'Higgins 360, Chillán",
    -72.1081449,
    -36.6029906,
  ),
  sedePoint(
    'concepcion',
    'Concepción',
    8,
    'Barros Arana 302, Concepción',
    -73.048663,
    -36.825783,
  ),
  sedePoint(
    'los-angeles',
    'Los Ángeles',
    8,
    'Mendoza 438, Los Ángeles',
    -72.3537044,
    -37.467506,
  ),
  sedePoint(
    'temuco',
    'Temuco',
    9,
    'Avenida Alemania 035, Temuco',
    -72.60188,
    -38.7363795,
  ),
  sedePoint(
    'osorno',
    'Osorno',
    10,
    'Patricio Lynch 1462, Osorno',
    -73.1248913,
    -40.5742763,
  ),
  sedePoint(
    'puerto-montt',
    'Puerto Montt',
    10,
    'Benavente 702, Puerto Montt',
    -72.9464425,
    -41.4717146,
  ),
  sedePoint(
    'castro',
    'Castro',
    10,
    "O'Higgins 801, Castro",
    -73.7652759,
    -42.4768052,
  ),
  sedePoint(
    'iquique',
    'Iquique',
    1,
    'Aníbal Pinto 699, Iquique',
    -70.1530872,
    -20.2212879,
  ),
];

const POINTS_BY_ID = new Map(POINTS.map((point) => [point.id, point]));

const OMIT = new Set([
  'online',
  'aieponline',
  'aiep online',
  'virtual',
  'ead',
]);

const ALIASES: Record<string, string> = {
  calama: 'calama',
  antofagasta: 'antofagasta',
  laserena: 'la-serena',
  'la serena': 'la-serena',
  coquimbo: 'la-serena',
  valparaiso: 'valparaiso',
  valparaíso: 'valparaiso',
  vinadelmar: 'vina-del-mar',
  'vina del mar': 'vina-del-mar',
  'viña del mar': 'vina-del-mar',
  vina: 'vina-del-mar',
  viña: 'vina-del-mar',
  sanfelipe: 'san-felipe',
  'san felipe': 'san-felipe',
  sanantonio: 'san-antonio',
  'san antonio': 'san-antonio',
  santiagonorte: 'santiago-norte',
  'santiago norte': 'santiago-norte',
  conchali: 'santiago-norte',
  conchalí: 'santiago-norte',
  renca: 'santiago-norte',
  bellavista: 'bellavista',
  santiago: 'bellavista',
  'casa central': 'bellavista',
  casacentral: 'bellavista',
  providencia: 'bellavista',
  'barrio universitario': 'barrio-universitario',
  barriouniversitario: 'barrio-universitario',
  republica: 'barrio-universitario',
  república: 'barrio-universitario',
  ejercito: 'barrio-universitario',
  ejército: 'barrio-universitario',
  sanjoaquin: 'san-joaquin',
  'san joaquin': 'san-joaquin',
  'san joaquín': 'san-joaquin',
  maipu: 'maipu',
  maipú: 'maipu',
  sanbernardo: 'san-bernardo',
  'san bernardo': 'san-bernardo',
  rancagua: 'rancagua',
  sanfernando: 'san-fernando',
  'san fernando': 'san-fernando',
  curico: 'curico',
  curicó: 'curico',
  talca: 'talca',
  chillan: 'chillan',
  chillán: 'chillan',
  concepcion: 'concepcion',
  concepción: 'concepcion',
  'los angeles': 'los-angeles',
  'los ángeles': 'los-angeles',
  losangeles: 'los-angeles',
  temuco: 'temuco',
  osorno: 'osorno',
  puertomontt: 'puerto-montt',
  'puerto montt': 'puerto-montt',
  castro: 'castro',
  chiloe: 'castro',
  chiloé: 'castro',
  'isla de chiloe': 'castro',
  iquique: 'iquique',
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/sede/g, ' ')
    .replace(/aiep/g, ' ')
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string): string {
  return fold(value).replace(/[\s-]/g, '');
}

export function resolveSedeGeo(nombre: string): AiepSedeGeoPoint | null {
  const folded = fold(nombre);
  if (!folded) return null;
  const packed = compact(folded);
  if (OMIT.has(folded) || OMIT.has(packed)) return null;

  const aliasId = ALIASES[folded] ?? ALIASES[packed];
  if (aliasId) return POINTS_BY_ID.get(aliasId) ?? null;

  for (const point of POINTS) {
    if (folded === fold(point.label) || packed === compact(point.label)) {
      return point;
    }
  }

  for (const point of POINTS) {
    const labelFold = fold(point.label);
    if (labelFold.length >= 5 && folded.includes(labelFold)) {
      return point;
    }
  }

  return null;
}

export function groupVitrinaProyectosBySede(
  proyectos: Array<
    Pick<VitrinaProyecto, 'nombre' | 'sedes'> &
      Partial<
        Pick<
          VitrinaProyecto,
          'id' | 'fotos' | 'coverOffsetX' | 'coverOffsetY' | 'coverZoom'
        >
      >
  >,
): AiepSedePin[] {
  const byId = new Map<
    string,
    { point: AiepSedeGeoPoint; items: Map<string, AiepSedePinProyecto> }
  >();

  for (const proyecto of proyectos) {
    const nombre = proyecto.nombre.trim();
    if (!nombre) continue;
    const id = (proyecto.id ?? nombre).trim() || nombre;
    const fotoUrl = proyecto.fotos?.[0]?.url ?? null;
    const coverOffsetX = proyecto.coverOffsetX ?? VITRINA_COVER_OFFSET_DEFAULT;
    const coverOffsetY = proyecto.coverOffsetY ?? VITRINA_COVER_OFFSET_DEFAULT;
    const coverZoom = proyecto.coverZoom ?? VITRINA_COVER_ZOOM_DEFAULT;
    for (const sede of proyecto.sedes) {
      const point = resolveSedeGeo(sede);
      if (!point) continue;
      const bucket = byId.get(point.id) ?? {
        point,
        items: new Map<string, AiepSedePinProyecto>(),
      };
      if (!bucket.items.has(id)) {
        bucket.items.set(id, {
          id,
          nombre,
          fotoUrl,
          coverOffsetX,
          coverOffsetY,
          coverZoom,
        });
      }
      byId.set(point.id, bucket);
    }
  }

  return [...byId.values()]
    .map(({ point, items }) => {
      const proyectosPin = [...items.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      );
      return {
        ...point,
        proyectos: proyectosPin,
        nombres: proyectosPin.map((item) => item.nombre),
      };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function groupVitrinaProyectosByRegion(
  pins: AiepSedePin[],
): AiepRegionPin[] {
  const byRegion = new Map<
    number,
    { xs: number[]; ys: number[]; names: Set<string> }
  >();
  for (const pin of pins) {
    const bucket = byRegion.get(pin.regionId) ?? {
      xs: [],
      ys: [],
      names: new Set<string>(),
    };
    bucket.xs.push(pin.x);
    bucket.ys.push(pin.y);
    for (const nombre of pin.nombres) bucket.names.add(nombre);
    byRegion.set(pin.regionId, bucket);
  }
  return [...byRegion.entries()]
    .map(([regionId, bucket]) => ({
      regionId,
      x: bucket.xs.reduce((sum, value) => sum + value, 0) / bucket.xs.length,
      y: bucket.ys.reduce((sum, value) => sum + value, 0) / bucket.ys.length,
      count: bucket.names.size,
    }))
    .sort((a, b) => a.y - b.y);
}

export function pinsForRegion(
  pins: AiepSedePin[],
  regionId: number | null,
): AiepSedePin[] {
  if (regionId == null) return [];
  return pins.filter((pin) => pin.regionId === regionId);
}

export function nationalPinRadius(count: number): number {
  return Math.min(11, 4.5 + Math.min(Math.max(count, 1), 12) * 0.55);
}

export function pinRadius(count: number): number {
  return Math.min(14, 7 + Math.min(Math.max(count, 1), 10) * 0.7);
}

export function formatSedeLabel(label: string): string {
  const parts = sedeLabelParts(label);
  return `${parts.top} ${parts.bottom}`.trim();
}

export function sedeLabelParts(label: string): { top: string; bottom: string } {
  const trimmed = label.trim();
  const bottom = trimmed.replace(/^sede\s+/i, '').trim() || trimmed;
  return { top: 'Sede', bottom };
}

export function zoomPinRadius(count: number, minDim: number): number {
  const base = minDim * 0.006;
  const extra = minDim * 0.0018 * Math.min(Math.max(count, 1) - 1, 6);
  return Math.min(base + extra, minDim * 0.014);
}

export type FloatingMapCard = {
  pinId: string;
  proyecto: AiepSedePinProyecto;
  left: number;
  top: number;
};

/** Etiqueta de sede en coordenadas del overlay (px), anclada al grupo de tarjetas. */
export type OverlaySedeLabel = {
  pinId: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  textAlign: 'left' | 'center' | 'right';
  /** Punto del texto hacia el que llega la línea. */
  lineFrom: { x: number; y: number };
  /** Pin en overlay. */
  lineTo: { x: number; y: number };
};

/** Intersección del rayo pin→centro con el borde del rectángulo (fuera→dentro). */
function rayEnterAabb(
  origin: { x: number; y: number },
  target: { x: number; y: number },
  box: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  let tEnter = 0;
  let tExit = 1;

  const clip = (min: number, max: number, originV: number, delta: number) => {
    if (Math.abs(delta) < 1e-9) {
      if (originV < min || originV > max) {
        tEnter = 1;
        tExit = 0;
      }
      return;
    }
    let t1 = (min - originV) / delta;
    let t2 = (max - originV) / delta;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    tEnter = Math.max(tEnter, t1);
    tExit = Math.min(tExit, t2);
  };

  clip(box.left, box.right, origin.x, dx);
  clip(box.top, box.bottom, origin.y, dy);

  if (tEnter > tExit || tEnter > 1 || tEnter < 0) {
    return { x: target.x, y: target.y };
  }
  return { x: origin.x + dx * tEnter, y: origin.y + dy * tEnter };
}

/**
 * Coloca el nombre de sede junto al grupo de tarjetas (antes en el eje hacia el mapa).
 * La línea apunta al centro del label y se corta en su borde (misma dirección, sin cruzar texto).
 */
export function layoutOverlaySedeLabelsNearCards({
  pins,
  positions,
  cards,
  cardWidth,
  cardHeight,
  regionId,
  labelFontPx = VITRINA_MAP_LABEL_PX,
  gap = 8,
}: {
  pins: Array<{ id: string; label: string }>;
  positions: Record<string, { x: number; y: number }>;
  cards: FloatingMapCard[];
  cardWidth: number;
  cardHeight: number;
  regionId?: number;
  labelFontPx?: number;
  gap?: number;
}): OverlaySedeLabel[] {
  const withCards = pins.filter(
    (pin) => positions[pin.id] && cards.some((card) => card.pinId === pin.id),
  );
  if (withCards.length === 0) return [];

  const cx =
    withCards.reduce((sum, pin) => sum + (positions[pin.id]?.x ?? 0), 0) /
    withCards.length;
  const cy =
    withCards.reduce((sum, pin) => sum + (positions[pin.id]?.y ?? 0), 0) /
    withCards.length;

  const labelH = labelFontPx * 2.35;
  const placed: OverlaySedeLabel[] = [];

  for (const pin of withCards) {
    const pinPos = positions[pin.id]!;
    const cluster = cards.filter((card) => card.pinId === pin.id);
    const left = Math.min(...cluster.map((card) => card.left));
    const top = Math.min(...cluster.map((card) => card.top));
    const right = Math.max(...cluster.map((card) => card.left + cardWidth));
    const bottom = Math.max(...cluster.map((card) => card.top + cardHeight));
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    const zone = compassSedeZone(regionId, pin.id, pinPos.x - cx, pinPos.y - cy);
    const parts = sedeLabelParts(pin.label);
    const labelW = Math.max(
      estimateLabelWidth(pin.label, labelFontPx),
      Math.max(parts.top.length, parts.bottom.length) * labelFontPx * 0.55,
      56,
    );

    let labelLeft = left;
    let labelTop = top;
    let textAlign: OverlaySedeLabel['textAlign'] = 'center';

    // Maipú: nombre sobre las tarjetas (pedido explícito).
    if (pin.id === 'maipu') {
      labelTop = top - gap - labelH;
      labelLeft = midX - labelW / 2;
      textAlign = 'center';
    } else if (zone === 'n' || zone === 'ne' || zone === 'nw') {
      labelTop = bottom + gap;
      if (zone === 'n') {
        labelLeft = midX - labelW / 2;
        textAlign = 'center';
      } else if (zone === 'nw') {
        labelLeft = Math.min(right - labelW * 0.35, midX);
        textAlign = 'right';
      } else {
        labelLeft = Math.max(left - labelW * 0.15, midX - labelW);
        textAlign = 'left';
      }
    } else if (zone === 's' || zone === 'se' || zone === 'sw') {
      labelTop = top - gap - labelH;
      if (zone === 's') {
        labelLeft = midX - labelW / 2;
        textAlign = 'center';
      } else if (zone === 'sw') {
        labelLeft = Math.min(right - labelW * 0.35, midX);
        textAlign = 'right';
      } else {
        labelLeft = Math.max(left - labelW * 0.15, midX - labelW);
        textAlign = 'left';
      }
    } else if (zone === 'e') {
      labelLeft = left - gap - labelW;
      labelTop = midY - labelH / 2;
      textAlign = 'right';
    } else {
      labelLeft = right + gap;
      labelTop = midY - labelH / 2;
      textAlign = 'left';
    }

    const labelCenter = {
      x: labelLeft + labelW / 2,
      y: labelTop + labelH / 2,
    };
    const lineFrom = rayEnterAabb(pinPos, labelCenter, {
      left: labelLeft,
      top: labelTop,
      right: labelLeft + labelW,
      bottom: labelTop + labelH,
    });

    placed.push({
      pinId: pin.id,
      label: pin.label,
      left: labelLeft,
      top: labelTop,
      width: labelW,
      height: labelH,
      textAlign,
      lineFrom,
      lineTo: { x: pinPos.x, y: pinPos.y },
    });
  }

  return placed;
}

export const VITRINA_MAP_LABEL_PX = 12;
/** Hover del mapa nacional: px en pantalla (el SVG escala las unidades). */
export const VITRINA_MAP_HOVER_LABEL_PX = 14;
export const METROPOLITANA_REGION_ID = 13;
export const LOS_LAGOS_REGION_ID = 10;
export const OHIGGINS_REGION_ID = 6;
export const VALPARAISO_REGION_ID = 5;

/** Solo Viña del Mar separa nombre del pin en Valparaíso. */
const VALPARAISO_OVERLAY_LABEL_PINS = new Set(['vina-del-mar']);

/** Regiones que usan layout de brújula para tarjetas. */
export function usesCompassMapLayout(regionId?: number): boolean {
  return (
    regionId === METROPOLITANA_REGION_ID ||
    regionId === LOS_LAGOS_REGION_ID ||
    regionId === OHIGGINS_REGION_ID ||
    regionId === VALPARAISO_REGION_ID
  );
}

/** Etiqueta + línea en overlay (no texto SVG junto al pin). */
export function usesOverlaySedeLabel(
  regionId: number | undefined,
  pinId: string,
): boolean {
  if (regionId === METROPOLITANA_REGION_ID) return true;
  if (regionId === VALPARAISO_REGION_ID) {
    return VALPARAISO_OVERLAY_LABEL_PINS.has(pinId);
  }
  return false;
}

export type MapCompassZone = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type SedeLabelAnchor = {
  pinId: string;
  x: number;
  yTop: number;
  yBottom: number;
  textAnchor: 'middle' | 'start' | 'end';
  lineTo?: { x: number; y: number };
};

function estimateLabelWidth(label: string, fontSize: number): number {
  const parts = sedeLabelParts(label);
  const chars = Math.max(parts.top.length, parts.bottom.length, 4);
  return chars * fontSize * 0.62;
}

function labelBox(
  anchor: SedeLabelAnchor,
  width: number,
  fontSize: number,
): { left: number; right: number; top: number; bottom: number } {
  const pad = fontSize * 0.25;
  const left =
    anchor.textAnchor === 'start'
      ? anchor.x
      : anchor.textAnchor === 'end'
        ? anchor.x - width
        : anchor.x - width / 2;
  return {
    left: left - pad,
    right: left + width + pad,
    top: anchor.yTop - fontSize * 0.9 - pad,
    bottom: anchor.yBottom + pad,
  };
}

function boxesOverlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function labelSlots(
  pin: { x: number; y: number },
  radius: number,
  fontSize: number,
): Array<Pick<SedeLabelAnchor, 'x' | 'yTop' | 'yBottom' | 'textAnchor'>> {
  const line = fontSize * 1.05;
  const gap = fontSize * 0.35;
  return [
    {
      textAnchor: 'middle',
      x: pin.x,
      yTop: pin.y - radius - gap - line * 1.15,
      yBottom: pin.y - radius - gap - line * 0.12,
    },
    {
      textAnchor: 'middle',
      x: pin.x,
      yTop: pin.y + radius + gap + line * 0.95,
      yBottom: pin.y + radius + gap + line * 1.98,
    },
    {
      textAnchor: 'end',
      x: pin.x - radius - gap,
      yTop: pin.y - line * 0.55,
      yBottom: pin.y + line * 0.5,
    },
    {
      textAnchor: 'start',
      x: pin.x + radius + gap,
      yTop: pin.y - line * 0.55,
      yBottom: pin.y + line * 0.5,
    },
  ];
}

/** Orden de slots: Valparaíso (W) prioriza izquierda del pin. */
function orderedLabelSlots(
  pin: { id: string; x: number; y: number },
  radius: number,
  fontSize: number,
  regionId?: number,
): Array<Pick<SedeLabelAnchor, 'x' | 'yTop' | 'yBottom' | 'textAnchor'>> {
  const slots = labelSlots(pin, radius, fontSize);
  if (regionId === VALPARAISO_REGION_ID && pin.id === 'valparaiso') {
    // left, above, below, right
    return [slots[2]!, slots[0]!, slots[1]!, slots[3]!];
  }
  return slots;
}

export function layoutSedeLabels(
  pins: Array<{ id: string; x: number; y: number; label: string }>,
  {
    fontSize,
    radius,
    regionId,
    mapBBox,
  }: {
    fontSize: number;
    radius: number | ((id: string) => number);
    regionId?: number;
    mapBBox?: { minX: number; minY: number; width: number; height: number };
  },
): SedeLabelAnchor[] {
  if (regionId === METROPOLITANA_REGION_ID) {
    return layoutCompassSedeLabels(pins, {
      fontSize,
      radius,
      regionId,
      mapBBox,
    });
  }
  const radiusOf = typeof radius === 'function' ? radius : () => radius;
  const sorted = [...pins].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: SedeLabelAnchor[] = [];

  for (const pin of sorted) {
    const width = estimateLabelWidth(pin.label, fontSize);
    const r = radiusOf(pin.id);
    const slots = orderedLabelSlots(pin, r, fontSize, regionId);
    let chosen: SedeLabelAnchor | null = null;
    for (const slot of slots) {
      const candidate: SedeLabelAnchor = { pinId: pin.id, ...slot };
      const box = labelBox(candidate, width, fontSize);
      const hits = placed.some((other) => {
        const otherPin = pins.find((item) => item.id === other.pinId);
        const otherW = estimateLabelWidth(otherPin?.label ?? '', fontSize);
        return boxesOverlap(box, labelBox(other, otherW, fontSize));
      });
      if (!hits) {
        chosen = candidate;
        break;
      }
    }
    placed.push(chosen ?? { pinId: pin.id, ...slots[1]! });
  }
  return placed;
}

const RM_SEDE_ZONE: Record<string, MapCompassZone> = {
  'santiago-norte': 'n',
  'barrio-universitario': 'nw',
  bellavista: 'e',
  'san-joaquin': 'se',
  'san-bernardo': 's',
  maipu: 'w',
};

/** Los Lagos: Osorno NW, Puerto Montt E, Castro SW. */
const LOS_LAGOS_SEDE_ZONE: Record<string, MapCompassZone> = {
  osorno: 'nw',
  'puerto-montt': 'e',
  castro: 'sw',
};

/** O'Higgins: Rancagua E, San Fernando S. */
const OHIGGINS_SEDE_ZONE: Record<string, MapCompassZone> = {
  rancagua: 'e',
  'san-fernando': 's',
};

/** Valparaíso: Viña NW, Valparaíso W, San Felipe E, San Antonio SW. */
const VALPARAISO_SEDE_ZONE: Record<string, MapCompassZone> = {
  'vina-del-mar': 'nw',
  valparaiso: 'w',
  'san-felipe': 'e',
  'san-antonio': 'sw',
};

const REGION_SEDE_ZONES: Record<number, Record<string, MapCompassZone>> = {
  [METROPOLITANA_REGION_ID]: RM_SEDE_ZONE,
  [LOS_LAGOS_REGION_ID]: LOS_LAGOS_SEDE_ZONE,
  [OHIGGINS_REGION_ID]: OHIGGINS_SEDE_ZONE,
  [VALPARAISO_REGION_ID]: VALPARAISO_SEDE_ZONE,
};

const ZONE_VECTOR: Record<MapCompassZone, { x: number; y: number }> = {
  n: { x: 0, y: -1 },
  ne: { x: 0.707, y: -0.707 },
  e: { x: 1, y: 0 },
  se: { x: 0.707, y: 0.707 },
  s: { x: 0, y: 1 },
  sw: { x: -0.707, y: 0.707 },
  w: { x: -1, y: 0 },
  nw: { x: -0.707, y: -0.707 },
};

export function compassZoneFromDelta(dx: number, dy: number): MapCompassZone {
  const angle = Math.atan2(dy, dx);
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'e';
  if (deg < 67.5) return 'se';
  if (deg < 112.5) return 's';
  if (deg < 157.5) return 'sw';
  if (deg < 202.5) return 'w';
  if (deg < 247.5) return 'nw';
  if (deg < 292.5) return 'n';
  return 'ne';
}

export function compassSedeZone(
  regionId: number | undefined,
  pinId: string,
  dx: number,
  dy: number,
): MapCompassZone {
  const overrides =
    regionId != null ? REGION_SEDE_ZONES[regionId] : undefined;
  return overrides?.[pinId] ?? compassZoneFromDelta(dx, dy);
}

/** @deprecated Prefer compassSedeZone(METROPOLITANA_REGION_ID, …) */
export function metropolitanSedeZone(
  pinId: string,
  dx: number,
  dy: number,
): MapCompassZone {
  return compassSedeZone(METROPOLITANA_REGION_ID, pinId, dx, dy);
}

function zoneTextAnchor(zone: MapCompassZone): SedeLabelAnchor['textAnchor'] {
  if (zone === 'w' || zone === 'nw' || zone === 'sw') return 'end';
  if (zone === 'e' || zone === 'ne' || zone === 'se') return 'start';
  return 'middle';
}

export function layoutMetropolitanSedeLabels(
  pins: Array<{ id: string; x: number; y: number; label: string }>,
  opts: { fontSize: number; radius: number | ((id: string) => number) },
): SedeLabelAnchor[] {
  return layoutCompassSedeLabels(pins, {
    ...opts,
    regionId: METROPOLITANA_REGION_ID,
  });
}

export function layoutCompassSedeLabels(
  pins: Array<{ id: string; x: number; y: number; label: string }>,
  {
    fontSize,
    radius,
    regionId,
    mapBBox,
  }: {
    fontSize: number;
    radius: number | ((id: string) => number);
    regionId?: number;
    mapBBox?: { minX: number; minY: number; width: number; height: number };
  },
): SedeLabelAnchor[] {
  if (pins.length === 0) return [];
  const radiusOf = typeof radius === 'function' ? radius : () => radius;
  const xs = pins.map((pin) => pin.x);
  const ys = pins.map((pin) => pin.y);
  const pinsMinX = Math.min(...xs);
  const pinsMaxX = Math.max(...xs);
  const pinsMinY = Math.min(...ys);
  const pinsMaxY = Math.max(...ys);
  const bbox = mapBBox ?? {
    minX: pinsMinX,
    minY: pinsMinY,
    width: Math.max(pinsMaxX - pinsMinX, fontSize * 4),
    height: Math.max(pinsMaxY - pinsMinY, fontSize * 4),
  };
  const cx = bbox.minX + bbox.width / 2;
  const cy = bbox.minY + bbox.height / 2;
  const halfW = bbox.width / 2;
  const halfH = bbox.height / 2;
  // Justo fuera del polígono, en el hueco antes de las tarjetas (no más allá de ellas).
  const towardCards = Math.max(
    fontSize * 3.2,
    Math.min(bbox.width, bbox.height) * 0.14,
  );
  const line = fontSize * 1.05;
  const used = new Set<MapCompassZone>();
  const placed: SedeLabelAnchor[] = [];

  const ringOutside = (vec: { x: number; y: number }, pad: number) => {
    const ax = Math.abs(vec.x);
    const ay = Math.abs(vec.y);
    let edge = Infinity;
    if (ax > 1e-6) edge = Math.min(edge, halfW / ax);
    if (ay > 1e-6) edge = Math.min(edge, halfH / ay);
    if (!Number.isFinite(edge)) edge = Math.max(halfW, halfH);
    return edge + pad;
  };

  const ordered = [...pins].sort((a, b) => {
    const za = compassSedeZone(regionId, a.id, a.x - cx, a.y - cy);
    const zb = compassSedeZone(regionId, b.id, b.x - cx, b.y - cy);
    return za.localeCompare(zb);
  });

  for (const pin of ordered) {
    const zone = compassSedeZone(regionId, pin.id, pin.x - cx, pin.y - cy);
    const sameZoneIndex = used.has(zone) ? 1 : 0;
    used.add(zone);
    const vec = ZONE_VECTOR[zone];
    let ring =
      ringOutside(vec, towardCards + radiusOf(pin.id)) +
      sameZoneIndex * fontSize * 4;
    const width = estimateLabelWidth(pin.label, fontSize);
    let anchor: SedeLabelAnchor = {
      pinId: pin.id,
      x: cx + vec.x * ring,
      yTop: cy + vec.y * ring - line * 0.55,
      yBottom: cy + vec.y * ring + line * 0.5,
      textAnchor: zoneTextAnchor(zone),
      lineTo: { x: pin.x, y: pin.y },
    };
    let guard = 0;
    while (
      guard < 8 &&
      placed.some((other) => {
        const otherPin = pins.find((item) => item.id === other.pinId);
        const otherW = estimateLabelWidth(otherPin?.label ?? '', fontSize);
        return boxesOverlap(
          labelBox(anchor, width, fontSize),
          labelBox(other, otherW, fontSize),
        );
      })
    ) {
      ring += fontSize * 3;
      anchor = {
        ...anchor,
        x: cx + vec.x * ring,
        yTop: cy + vec.y * ring - line * 0.55,
        yBottom: cy + vec.y * ring + line * 0.5,
      };
      guard += 1;
    }
    placed.push(anchor);
  }
  return placed;
}

function layoutCompassMapCards({
  pins,
  positions,
  width,
  height,
  cardWidth,
  cardHeight,
  mapRect,
  gap,
  margin,
  maxCols,
  groupGap,
  regionId,
}: {
  pins: AiepSedePin[];
  positions: Record<string, { x: number; y: number }>;
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  mapRect: { left: number; top: number; width: number; height: number };
  gap: number;
  margin: number;
  maxCols: number;
  groupGap: number;
  regionId?: number;
}): FloatingMapCard[] {
  const active = pins.filter(
    (pin) => positions[pin.id] && pin.proyectos.length > 0,
  );
  if (active.length === 0) return [];
  const cx =
    active.reduce((sum, pin) => sum + (positions[pin.id]?.x ?? 0), 0) /
    active.length;
  const cy =
    active.reduce((sum, pin) => sum + (positions[pin.id]?.y ?? 0), 0) /
    active.length;

  type Cluster = {
    pinId: string;
    proyectos: AiepSedePinProyecto[];
    zone: MapCompassZone;
    pinX: number;
    pinY: number;
    stackW: number;
    stackH: number;
    cols: number;
    left: number;
    top: number;
  };

  const mapRight = mapRect.left + mapRect.width;
  const mapBottom = mapRect.top + mapRect.height;
  const mapMidX = mapRect.left + mapRect.width / 2;
  // Los Lagos: diagonales al costado a la altura del pin (más cerca del mapa).
  // Valparaíso: Viña en esquina NW (arriba-izquierda), no side-pinned.
  // RM: diagonales en las esquinas fuera del bbox.
  const sidePinnedDiagonals = regionId === LOS_LAGOS_REGION_ID;
  /** Extra separación Viña/Valparaíso respecto al mapa. */
  const valparaisoAway =
    regionId === VALPARAISO_REGION_ID ? Math.max(28, margin + 16) : 0;

  const clusters: Cluster[] = active.map((pin) => {
    const pos = positions[pin.id]!;
    const n = pin.proyectos.length;
    const cols = Math.min(n, maxCols);
    const rows = Math.ceil(n / maxCols);
    const stackW = cols * cardWidth + (cols - 1) * gap;
    const stackH = rows * cardHeight + (rows - 1) * gap;
    const zone = compassSedeZone(regionId, pin.id, pos.x - cx, pos.y - cy);
    // RM: Norte y San Bernardo un poco más lejos del mapa.
    // Valparaíso: Viña (NW) más arriba/izquierda; Valpo (W) solo izquierda.
    const zoneMargin =
      regionId === METROPOLITANA_REGION_ID && (zone === 'n' || zone === 's')
        ? margin + 20
        : regionId === VALPARAISO_REGION_ID && (zone === 'nw' || zone === 'w')
          ? margin + valparaisoAway
          : margin;
    let left = mapRect.left;
    let top = mapRect.top;
    if (zone === 'w' || zone === 'nw' || zone === 'sw') {
      left = mapRect.left - zoneMargin - stackW;
    } else if (zone === 'e' || zone === 'ne' || zone === 'se') {
      left = mapRight + margin;
    } else {
      left = mapMidX - stackW / 2;
    }
    if (zone === 'n' || (!sidePinnedDiagonals && (zone === 'nw' || zone === 'ne'))) {
      top = mapRect.top - zoneMargin - stackH;
    } else if (zone === 's' || zone === 'se' || zone === 'sw') {
      // Sur / SE / SW siempre bajo el mapa (p. ej. San Antonio abajo-izquierda).
      top = mapBottom + zoneMargin;
    } else {
      // e/w y NW/NE side-pinned: a la altura del pin
      top = pos.y - stackH / 2;
      if (sidePinnedDiagonals && zone === 'nw') {
        top = Math.min(top, mapRect.top + mapRect.height * 0.28 - stackH / 2);
      } else if (sidePinnedDiagonals && zone === 'ne') {
        top = Math.min(top, mapRect.top + mapRect.height * 0.28 - stackH / 2);
      }
    }
    return {
      pinId: pin.id,
      proyectos: pin.proyectos,
      zone,
      pinX: pos.x,
      pinY: pos.y,
      stackW,
      stackH,
      cols,
      left,
      top,
    };
  });

  const packAxis = (list: Cluster[], axis: 'x' | 'y') => {
    const sorted = [...list].sort((a, b) =>
      axis === 'x' ? a.pinX - b.pinX : a.pinY - b.pinY,
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      if (!prev || !current) continue;
      if (axis === 'x') {
        const minLeft = prev.left + prev.stackW + groupGap;
        if (current.left < minLeft) current.left = minLeft;
      } else {
        const minTop = prev.top + prev.stackH + groupGap;
        if (current.top < minTop) current.top = minTop;
      }
    }
  };

  packAxis(
    clusters.filter((c) => c.zone === 'n' || c.zone === 's'),
    'x',
  );
  packAxis(
    clusters.filter((c) => c.zone === 'nw' || c.zone === 'ne'),
    'x',
  );
  packAxis(
    clusters.filter((c) => c.zone === 'w' || c.zone === 'e'),
    'y',
  );
  packAxis(
    clusters.filter((c) => c.zone === 'nw' || c.zone === 'sw'),
    'y',
  );
  packAxis(
    clusters.filter((c) => c.zone === 'ne' || c.zone === 'se'),
    'y',
  );

  resolveCardGroupPadding(clusters, groupGap, width, height);
  const nsMargin =
    regionId === METROPOLITANA_REGION_ID ? margin + 20 : margin;
  const clampMargin =
    regionId === VALPARAISO_REGION_ID ? margin + valparaisoAway : nsMargin;
  anchorMetropolitanCardAxes(
    clusters,
    mapRect,
    mapMidX,
    nsMargin,
    width,
    height,
    groupGap,
  );
  resolveCardGroupPadding(clusters, groupGap, width, height);
  clampMetropolitanZoneSlots(
    clusters,
    mapRect,
    mapMidX,
    clampMargin,
    width,
    height,
    sidePinnedDiagonals,
  );
  // Valparaíso: W estrictamente a la altura del pin (solo izquierda).
  if (regionId === VALPARAISO_REGION_ID) {
    for (const cluster of clusters) {
      if (cluster.zone !== 'w') continue;
      cluster.top = cluster.pinY - cluster.stackH / 2;
      cluster.top = Math.min(
        Math.max(cluster.top, 0),
        Math.max(height - cluster.stackH, 0),
      );
      cluster.left = Math.min(
        mapRect.left - clampMargin - cluster.stackW,
        cluster.left,
      );
      cluster.left = Math.min(
        Math.max(cluster.left, 0),
        Math.max(width - cluster.stackW, 0),
      );
    }
  }

  const placed: FloatingMapCard[] = [];
  for (const cluster of clusters) {
    const left = Math.min(
      Math.max(cluster.left, 0),
      Math.max(width - cluster.stackW, 0),
    );
    const top = Math.min(
      Math.max(cluster.top, 0),
      Math.max(height - cluster.stackH, 0),
    );
    cluster.proyectos.forEach((proyecto, index) => {
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      placed.push({
        pinId: cluster.pinId,
        proyecto,
        left: left + col * (cardWidth + gap),
        top: top + row * (cardHeight + gap),
      });
    });
  }
  return placed;
}

/** Zona cardenal: N/S no se desplazan en X (quedan en el eje). */
function zoneLocksAxis(zone?: MapCompassZone): { lockX: boolean; lockY: boolean } {
  if (zone === 'n' || zone === 's') return { lockX: true, lockY: false };
  return { lockX: false, lockY: false };
}

/**
 * Reafirma ejes RM: N centrado arriba, S centrado abajo;
 * empuja laterales que invadan el padding bajo/sobre N/S.
 */
function anchorMetropolitanCardAxes(
  clusters: Array<{
    left: number;
    top: number;
    stackW: number;
    stackH: number;
    zone: MapCompassZone;
  }>,
  mapRect: { left: number; top: number; width: number; height: number },
  mapMidX: number,
  margin: number,
  width: number,
  height: number,
  groupGap: number,
) {
  const mapBottom = mapRect.top + mapRect.height;
  for (const cluster of clusters) {
    if (cluster.zone === 'n') {
      cluster.left = mapMidX - cluster.stackW / 2;
      cluster.top = Math.max(0, mapRect.top - margin - cluster.stackH);
    } else if (cluster.zone === 's') {
      cluster.left = mapMidX - cluster.stackW / 2;
      cluster.top = Math.min(
        Math.max(mapBottom + margin, 0),
        Math.max(height - cluster.stackH, 0),
      );
    }
    cluster.left = Math.min(
      Math.max(cluster.left, 0),
      Math.max(width - cluster.stackW, 0),
    );
    cluster.top = Math.min(
      Math.max(cluster.top, 0),
      Math.max(height - cluster.stackH, 0),
    );
  }

  for (const axis of clusters.filter((c) => c.zone === 'n' || c.zone === 's')) {
    const axisBottom = axis.top + axis.stackH + groupGap;
    const axisTop = axis.top - groupGap;
    for (const other of clusters) {
      if (other === axis) continue;
      // NW/NE/SW/SE comparten la franja superior/inferior: se separan en X, no se bajan.
      if (
        (axis.zone === 'n' && (other.zone === 'nw' || other.zone === 'ne')) ||
        (axis.zone === 's' && (other.zone === 'sw' || other.zone === 'se'))
      ) {
        continue;
      }
      const overlapsX =
        other.left < axis.left + axis.stackW + groupGap &&
        other.left + other.stackW > axis.left - groupGap;
      if (!overlapsX) continue;
      if (axis.zone === 'n' && other.top < axisBottom) {
        other.top = axisBottom;
      } else if (axis.zone === 's' && other.top + other.stackH > axisTop) {
        other.top = Math.max(0, axisTop - other.stackH);
      }
      other.top = Math.min(
        Math.max(other.top, 0),
        Math.max(height - other.stackH, 0),
      );
    }
  }
}

/** Evita que el padding saque a una sede de su cuadrante (p. ej. SE hacia el mapa). */
function clampMetropolitanZoneSlots(
  clusters: Array<{
    left: number;
    top: number;
    stackW: number;
    stackH: number;
    zone: MapCompassZone;
  }>,
  mapRect: { left: number; top: number; width: number; height: number },
  mapMidX: number,
  margin: number,
  width: number,
  height: number,
  sidePinnedDiagonals = false,
) {
  const mapRight = mapRect.left + mapRect.width;
  const mapBottom = mapRect.top + mapRect.height;
  for (const cluster of clusters) {
    if (cluster.zone === 'n') {
      cluster.left = mapMidX - cluster.stackW / 2;
      cluster.top = Math.max(0, mapRect.top - margin - cluster.stackH);
    } else if (cluster.zone === 's') {
      cluster.left = mapMidX - cluster.stackW / 2;
      cluster.top = Math.max(mapBottom + margin, cluster.top);
    } else if (cluster.zone === 'e') {
      cluster.left = Math.max(mapRight + margin, cluster.left);
    } else if (cluster.zone === 'w') {
      cluster.left = Math.min(mapRect.left - margin - cluster.stackW, cluster.left);
    } else if (cluster.zone === 'se') {
      cluster.left = Math.max(mapRight + margin, cluster.left);
      cluster.top = Math.max(mapBottom + margin, cluster.top);
    } else if (cluster.zone === 'sw') {
      cluster.left = Math.min(mapRect.left - margin - cluster.stackW, cluster.left);
      cluster.top = Math.max(mapBottom + margin, cluster.top);
    } else if (cluster.zone === 'ne') {
      cluster.left = Math.max(mapRight + margin, cluster.left);
      if (!sidePinnedDiagonals) {
        cluster.top = Math.min(
          cluster.top,
          Math.max(0, mapRect.top - margin - cluster.stackH),
        );
      }
    } else if (cluster.zone === 'nw') {
      cluster.left = Math.min(mapRect.left - margin - cluster.stackW, cluster.left);
      if (!sidePinnedDiagonals) {
        cluster.top = Math.min(
          cluster.top,
          Math.max(0, mapRect.top - margin - cluster.stackH),
        );
      }
    }
    cluster.left = Math.min(
      Math.max(cluster.left, 0),
      Math.max(width - cluster.stackW, 0),
    );
    cluster.top = Math.min(
      Math.max(cluster.top, 0),
      Math.max(height - cluster.stackH, 0),
    );
  }
}

/** Separa grupos de sedes que quedan demasiado cerca (padding entre clusters). */
function resolveCardGroupPadding(
  clusters: Array<{
    left: number;
    top: number;
    stackW: number;
    stackH: number;
    zone?: MapCompassZone;
  }>,
  groupGap: number,
  width: number,
  height: number,
) {
  const inflate = groupGap / 2;
  for (let pass = 0; pass < 16; pass++) {
    let moved = false;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i];
        const b = clusters[j];
        if (!a || !b) continue;
        const ax1 = a.left - inflate;
        const ay1 = a.top - inflate;
        const ax2 = a.left + a.stackW + inflate;
        const ay2 = a.top + a.stackH + inflate;
        const bx1 = b.left - inflate;
        const by1 = b.top - inflate;
        const bx2 = b.left + b.stackW + inflate;
        const by2 = b.top + b.stackH + inflate;
        if (ax1 >= bx2 || bx1 >= ax2 || ay1 >= by2 || by1 >= ay2) continue;

        const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
        const overlapY = Math.min(ay2, by2) - Math.max(ay1, by1);
        const va = a.zone ? ZONE_VECTOR[a.zone] : { x: 0, y: 0 };
        const vb = b.zone ? ZONE_VECTOR[b.zone] : { x: 0, y: 0 };
        const lockA = zoneLocksAxis(a.zone);
        const lockB = zoneLocksAxis(b.zone);

        // N/S vs laterales: separación vertical para no correr N hacia Bellavista.
        // Misma franja (N+NW/NE o S+SW/SE): separar en X, no subir/bajar al mapa.
        const cardinal = (z?: MapCompassZone) => z === 'n' || z === 's';
        const lateral = (z?: MapCompassZone) =>
          z === 'e' ||
          z === 'w' ||
          z === 'ne' ||
          z === 'nw' ||
          z === 'se' ||
          z === 'sw';
        const northBand = (z?: MapCompassZone) =>
          z === 'n' || z === 'ne' || z === 'nw';
        const southBand = (z?: MapCompassZone) =>
          z === 's' || z === 'se' || z === 'sw';
        const sameBand =
          (northBand(a.zone) && northBand(b.zone)) ||
          (southBand(a.zone) && southBand(b.zone));
        const preferY =
          !sameBand &&
          ((cardinal(a.zone) && lateral(b.zone)) ||
            (cardinal(b.zone) && lateral(a.zone)));
        const separateY = preferY || (!sameBand && overlapY <= overlapX);

        if (separateY) {
          const push = Math.max(overlapY / 2, 4);
          let da = va.y !== 0 ? Math.sign(va.y) : a.top <= b.top ? -1 : 1;
          let db = vb.y !== 0 ? Math.sign(vb.y) : b.top < a.top ? -1 : 1;
          if (da === db) {
            if (a.top <= b.top) {
              da = -1;
              db = 1;
            } else {
              da = 1;
              db = -1;
            }
          }
          if (!lockA.lockY) a.top += da * push;
          if (!lockB.lockY) b.top += db * push;
          if (lockA.lockY && !lockB.lockY) b.top += db * push;
          if (lockB.lockY && !lockA.lockY) a.top += da * push;
        } else {
          const push = Math.max(overlapX / 2, 4);
          let da = va.x !== 0 ? Math.sign(va.x) : a.left <= b.left ? -1 : 1;
          let db = vb.x !== 0 ? Math.sign(vb.x) : b.left < a.left ? -1 : 1;
          if (da === db) {
            if (a.left <= b.left) {
              da = -1;
              db = 1;
            } else {
              da = 1;
              db = -1;
            }
          }
          if (!lockA.lockX) a.left += da * push;
          if (!lockB.lockX) b.left += db * push;
          if (lockA.lockX && !lockB.lockX) b.left += db * push;
          if (lockB.lockX && !lockA.lockX) a.left += da * push;
        }

        a.left = Math.min(Math.max(a.left, 0), Math.max(width - a.stackW, 0));
        a.top = Math.min(Math.max(a.top, 0), Math.max(height - a.stackH, 0));
        b.left = Math.min(Math.max(b.left, 0), Math.max(width - b.stackW, 0));
        b.top = Math.min(Math.max(b.top, 0), Math.max(height - b.stackH, 0));
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function cardSidesByPinX(
  positions: Record<string, { x: number; y: number }>,
  pinIds: string[],
  mapWidth: number,
): Record<string, 'left' | 'right'> {
  const xs = pinIds
    .map((id) => positions[id]?.x)
    .filter((x): x is number => typeof x === 'number');
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = maxX - minX;
  const mid = (minX + maxX) / 2;
  const minSpan = Math.max(18, mapWidth * 0.1);
  const sides: Record<string, 'left' | 'right'> = {};
  for (const id of pinIds) {
    const x = positions[id]?.x ?? minX;
    sides[id] = span < minSpan ? 'left' : x >= mid ? 'right' : 'left';
  }
  if (pinIds.length >= 2 && span >= minSpan) {
    const ordered = [...pinIds].sort(
      (a, b) => (positions[a]?.x ?? 0) - (positions[b]?.x ?? 0),
    );
    const west = ordered[0];
    const east = ordered[ordered.length - 1];
    if (west) sides[west] = 'left';
    if (east) sides[east] = 'right';
  }
  return sides;
}

export function layoutFloatingMapCards({
  pins,
  positions,
  width,
  height,
  cardWidth,
  cardHeight,
  mapRect,
  gap = 8,
  margin = 10,
  maxCols = 3,
  groupGap = 28,
  regionId,
}: {
  pins: AiepSedePin[];
  positions: Record<string, { x: number; y: number }>;
  width: number;
  height: number;
  cardWidth: number;
  cardHeight: number;
  mapRect: { left: number; top: number; width: number; height: number };
  gap?: number;
  margin?: number;
  maxCols?: number;
  groupGap?: number;
  regionId?: number;
}): FloatingMapCard[] {
  if (width <= 0 || height <= 0) return [];
  if (usesCompassMapLayout(regionId)) {
    return layoutCompassMapCards({
      pins,
      positions,
      width,
      height,
      cardWidth,
      cardHeight,
      mapRect,
      gap,
      margin,
      maxCols,
      groupGap,
      regionId,
    });
  }

  type Cluster = {
    pinId: string;
    proyectos: AiepSedePinProyecto[];
    pinY: number;
    side: 'left' | 'right';
    cols: number;
    rows: number;
    stackW: number;
    stackH: number;
    left: number;
    top: number;
  };

  const activeIds = pins
    .filter((pin) => positions[pin.id] && pin.proyectos.length > 0)
    .map((pin) => pin.id);
  const sides = cardSidesByPinX(positions, activeIds, mapRect.width);

  const clusters: Cluster[] = [];
  for (const pin of pins) {
    const pos = positions[pin.id];
    if (!pos || pin.proyectos.length === 0) continue;
    const n = pin.proyectos.length;
    const cols = Math.min(n, maxCols);
    const rows = Math.ceil(n / maxCols);
    const stackW = cols * cardWidth + (cols - 1) * gap;
    const stackH = rows * cardHeight + (rows - 1) * gap;
    const side = sides[pin.id] ?? 'left';
    const left =
      side === 'left'
        ? mapRect.left - margin - stackW
        : mapRect.left + mapRect.width + margin;
    clusters.push({
      pinId: pin.id,
      proyectos: pin.proyectos,
      pinY: pos.y,
      side,
      cols,
      rows,
      stackW,
      stackH,
      left,
      top: pos.y - stackH / 2,
    });
  }

  for (const side of ['left', 'right'] as const) {
    const list = clusters
      .filter((cluster) => cluster.side === side)
      .sort((a, b) => a.pinY - b.pinY);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const current = list[i];
      if (!prev || !current) continue;
      const minTop = prev.top + prev.stackH + groupGap;
      if (current.top < minTop) current.top = minTop;
    }
    const last = list[list.length - 1];
    if (last && last.top + last.stackH > height) {
      let shift = last.top + last.stackH - height;
      for (const cluster of list) cluster.top -= shift;
      const first = list[0];
      if (first && first.top < 0) {
        shift = -first.top;
        for (const cluster of list) cluster.top += shift;
      }
    }
  }

  resolveCardGroupPadding(clusters, groupGap, width, height);

  const placed: FloatingMapCard[] = [];
  for (const cluster of clusters) {
    const left = Math.min(
      Math.max(cluster.left, 0),
      Math.max(width - cluster.stackW, 0),
    );
    const top = Math.min(
      Math.max(cluster.top, 0),
      Math.max(height - cluster.stackH, 0),
    );
    cluster.proyectos.forEach((proyecto, index) => {
      const col = index % maxCols;
      const row = Math.floor(index / maxCols);
      placed.push({
        pinId: cluster.pinId,
        proyecto,
        left: left + col * (cardWidth + gap),
        top: top + row * (cardHeight + gap),
      });
    });
  }
  return placed;
}
