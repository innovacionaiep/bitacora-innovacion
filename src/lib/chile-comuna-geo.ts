import {
  CHILE_COMUNA_GEO,
  type ChileComunaGeo,
} from '@/lib/chile-comuna-geo-data';
import { projectChileLonLat } from '@/lib/chile-horizontal-paths';

export type ChileComunaGeoPoint = ChileComunaGeo & {
  id: string;
  x: number;
  y: number;
};

function foldComunaName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugComunaId(nombre: string): string {
  return foldComunaName(nombre).replace(/\s+/g, '-') || 'comuna';
}

const BY_FOLD = new Map<string, ChileComunaGeo>();
for (const row of CHILE_COMUNA_GEO) {
  BY_FOLD.set(foldComunaName(row.nombre), row);
}

export function resolveComunaGeo(nombre: string): ChileComunaGeoPoint | null {
  const key = foldComunaName(nombre);
  if (!key) return null;
  const row = BY_FOLD.get(key);
  if (!row) return null;
  const { x, y } = projectChileLonLat(row.lon, row.lat);
  return {
    ...row,
    id: `comuna-${slugComunaId(row.nombre)}`,
    x,
    y,
  };
}
