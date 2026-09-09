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

export const METROPOLITANA_REGION_ID = 13;

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

export function layoutSedeLabels(
  pins: Array<{ id: string; x: number; y: number; label: string }>,
  {
    fontSize,
    radius,
    regionId,
  }: {
    fontSize: number;
    radius: number | ((id: string) => number);
    regionId?: number;
  },
): SedeLabelAnchor[] {
  if (regionId === METROPOLITANA_REGION_ID) {
    return layoutMetropolitanSedeLabels(pins, { fontSize, radius });
  }
  const radiusOf = typeof radius === 'function' ? radius : () => radius;
  const sorted = [...pins].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: SedeLabelAnchor[] = [];

  for (const pin of sorted) {
    const width = estimateLabelWidth(pin.label, fontSize);
    const r = radiusOf(pin.id);
    const slots = labelSlots(pin, r, fontSize);
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
  'barrio-universitario': 'ne',
  bellavista: 'e',
  'san-joaquin': 'se',
  'san-bernardo': 's',
  maipu: 'w',
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

export function metropolitanSedeZone(
  pinId: string,
  dx: number,
  dy: number,
): MapCompassZone {
  return RM_SEDE_ZONE[pinId] ?? compassZoneFromDelta(dx, dy);
}

function zoneTextAnchor(zone: MapCompassZone): SedeLabelAnchor['textAnchor'] {
  if (zone === 'w' || zone === 'nw' || zone === 'sw') return 'end';
  if (zone === 'e' || zone === 'ne' || zone === 'se') return 'start';
  return 'middle';
}

export function layoutMetropolitanSedeLabels(
  pins: Array<{ id: string; x: number; y: number; label: string }>,
  { fontSize, radius }: { fontSize: number; radius: number | ((id: string) => number) },
): SedeLabelAnchor[] {
  if (pins.length === 0) return [];
  const radiusOf = typeof radius === 'function' ? radius : () => radius;
  const cx = pins.reduce((sum, pin) => sum + pin.x, 0) / pins.length;
  const cy = pins.reduce((sum, pin) => sum + pin.y, 0) / pins.length;
  const clusterR = Math.max(
    ...pins.map((pin) => Math.hypot(pin.x - cx, pin.y - cy)),
    fontSize * 2,
  );
  const line = fontSize * 1.05;
  const used = new Set<MapCompassZone>();
  const placed: SedeLabelAnchor[] = [];

  const ordered = [...pins].sort((a, b) => {
    const za = metropolitanSedeZone(a.id, a.x - cx, a.y - cy);
    const zb = metropolitanSedeZone(b.id, b.x - cx, b.y - cy);
    return za.localeCompare(zb);
  });

  for (const pin of ordered) {
    const zone = metropolitanSedeZone(pin.id, pin.x - cx, pin.y - cy);
    const sameZoneIndex = used.has(zone) ? 1 : 0;
    used.add(zone);
    const vec = ZONE_VECTOR[zone];
    let ring =
      clusterR + radiusOf(pin.id) + fontSize * 8 + sameZoneIndex * fontSize * 4;
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

function layoutMetropolitanMapCards({
  pins,
  positions,
  width,
  height,
  cardWidth,
  cardHeight,
  mapRect,
  gap,
  margin,
  maxRows,
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
  maxRows: number;
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

  const clusters: Cluster[] = active.map((pin) => {
    const pos = positions[pin.id]!;
    const n = pin.proyectos.length;
    const cols = Math.ceil(n / maxRows);
    const rows = Math.min(n, maxRows);
    const stackW = cols * cardWidth + (cols - 1) * gap;
    const stackH = rows * cardHeight + (rows - 1) * gap;
    const zone = metropolitanSedeZone(pin.id, pos.x - cx, pos.y - cy);
    const mapRight = mapRect.left + mapRect.width;
    const mapBottom = mapRect.top + mapRect.height;
    let left = mapRect.left;
    let top = mapRect.top;
    if (zone === 'w' || zone === 'nw' || zone === 'sw') {
      left = mapRect.left - margin - stackW;
    } else if (zone === 'e' || zone === 'ne' || zone === 'se') {
      left = mapRight + margin;
    } else {
      left = pos.x - stackW / 2;
    }
    if (zone === 'n' || zone === 'nw' || zone === 'ne') {
      top = mapRect.top - margin - stackH;
    } else if (zone === 's' || zone === 'sw' || zone === 'se') {
      top = mapBottom + margin;
    } else {
      top = pos.y - stackH / 2;
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
        const minLeft = prev.left + prev.stackW + gap;
        if (current.left < minLeft) current.left = minLeft;
      } else {
        const minTop = prev.top + prev.stackH + gap;
        if (current.top < minTop) current.top = minTop;
      }
    }
  };

  packAxis(
    clusters.filter((c) => c.zone === 'n' || c.zone === 's'),
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
      const col = Math.floor(index / maxRows);
      const row = index % maxRows;
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
  maxRows = 2,
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
  maxRows?: number;
  regionId?: number;
}): FloatingMapCard[] {
  if (width <= 0 || height <= 0) return [];
  if (regionId === METROPOLITANA_REGION_ID) {
    return layoutMetropolitanMapCards({
      pins,
      positions,
      width,
      height,
      cardWidth,
      cardHeight,
      mapRect,
      gap,
      margin,
      maxRows,
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
    const cols = Math.ceil(n / maxRows);
    const rows = Math.min(n, maxRows);
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
      const minTop = prev.top + prev.stackH + gap;
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
      const col = Math.floor(index / maxRows);
      const row = index % maxRows;
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
