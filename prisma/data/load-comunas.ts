import fs from 'fs';
import path from 'path';

export type ComunaRow = { nombre: string; region: string };

const CSV_PATH = path.join(__dirname, 'comunas_con_region.csv');

/**
 * Lee el CSV de comunas y regiones y devuelve un array de { nombre, region }.
 * La primera línea del CSV es la cabecera (Comuna,Región).
 */
export function loadComunasFromCsv(): ComunaRow[] {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  const rows: ComunaRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf(',');
    if (idx === -1) continue;
    const nombre = line.slice(0, idx).trim();
    const region = line.slice(idx + 1).trim();
    if (nombre && region) rows.push({ nombre, region });
  }
  return rows;
}
