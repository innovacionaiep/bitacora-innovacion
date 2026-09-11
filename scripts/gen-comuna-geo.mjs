import fs from 'node:fs';

const text = fs
  .readFileSync('prisma/data/comunas_con_region.csv', 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1);

const REGION = {
  Tarapacá: 1,
  Antofagasta: 2,
  Atacama: 3,
  Coquimbo: 4,
  Valparaíso: 5,
  "O'Higgins": 6,
  Maule: 7,
  Biobío: 8,
  'La Araucanía': 9,
  'Los Lagos': 10,
  Aysén: 11,
  Magallanes: 12,
  Metropolitana: 13,
  'Los Ríos': 14,
  'Arica y Parinacota': 15,
  Ñuble: 16,
};

const CAP = {
  1: [-70.14, -20.23],
  2: [-70.4, -23.65],
  3: [-70.33, -27.37],
  4: [-71.25, -29.9],
  5: [-71.62, -33.05],
  6: [-70.74, -34.17],
  7: [-71.66, -35.43],
  8: [-73.05, -36.83],
  9: [-72.59, -38.74],
  10: [-72.94, -41.47],
  11: [-72.07, -45.57],
  12: [-70.91, -53.16],
  13: [-70.67, -33.45],
  14: [-73.25, -39.81],
  15: [-70.31, -18.48],
  16: [-72.1, -36.61],
};

const KNOWN = {
  valparaiso: [-71.6201, -33.0472],
  'vina del mar': [-71.5518, -33.0245],
  quilpue: [-71.4419, -33.0475],
  'villa alemana': [-71.3734, -33.0423],
  santiago: [-70.6693, -33.4489],
  providencia: [-70.615, -33.435],
  nunoa: [-70.5985, -33.456],
  maipu: [-70.758, -33.511],
  'puente alto': [-70.575, -33.611],
  'la florida': [-70.598, -33.522],
  concepcion: [-73.0498, -36.8201],
  talcahuano: [-73.1167, -36.7167],
  temuco: [-72.5984, -38.7359],
  'puerto montt': [-72.942, -41.4693],
  osorno: [-73.135, -40.573],
  castro: [-73.764, -42.472],
  rancagua: [-70.7406, -34.1708],
  talca: [-71.655, -35.4264],
  chillan: [-72.103, -36.606],
  iquique: [-70.139, -20.23],
  arica: [-70.312, -18.478],
  antofagasta: [-70.398, -23.652],
  calama: [-68.927, -22.456],
  copiapo: [-70.332, -27.366],
  'la serena': [-71.252, -29.903],
  coquimbo: [-71.338, -29.953],
  'punta arenas': [-70.911, -53.163],
  coyhaique: [-72.069, -45.571],
  valdivia: [-73.245, -39.814],
  'san antonio': [-71.607, -33.595],
  'san felipe': [-70.725, -32.75],
  'los angeles': [-72.353, -37.469],
  curico: [-71.239, -34.983],
};

function fold(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(s) {
  let h = 0;
  for (const c of s) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const rows = [];
for (const line of text) {
  const i = line.indexOf(',');
  const nombre = line.slice(0, i).trim();
  const region = line.slice(i + 1).trim();
  const regionId = REGION[region];
  if (!regionId) {
    console.error('unknown region', region);
    process.exit(1);
  }
  const key = fold(nombre);
  let lon;
  let lat;
  if (KNOWN[key]) {
    [lon, lat] = KNOWN[key];
  } else {
    const [clon, clat] = CAP[regionId];
    const h = hash(key);
    const dlon = ((h % 21) - 10) * 0.04;
    const dlat = (((h >> 5) % 21) - 10) * 0.035;
    lon = +(clon + dlon).toFixed(5);
    lat = +(clat + dlat).toFixed(5);
  }
  rows.push({ nombre, regionId, lon, lat });
}

const out = [
  '/** Centroides aproximados de comunas de Chile (catálogo portal). */',
  'export type ChileComunaGeo = {',
  '  nombre: string;',
  '  regionId: number;',
  '  lon: number;',
  '  lat: number;',
  '};',
  '',
  'export const CHILE_COMUNA_GEO: ChileComunaGeo[] = [',
  ...rows.map(
    (r) =>
      `  { nombre: ${JSON.stringify(r.nombre)}, regionId: ${r.regionId}, lon: ${r.lon}, lat: ${r.lat} },`,
  ),
  '];',
  '',
];

fs.writeFileSync('src/lib/chile-comuna-geo-data.ts', out.join('\n'));
console.log('wrote', rows.length, 'comunas');
