import { LIST_SEP } from './types';

export function normKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function cellStr(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel date serial
    if (value > 20000 && value < 60000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + value * 86400000);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return String(value);
  }
  return String(value).trim();
}

export function splitList(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw
    .split(LIST_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Recorta al límite de BD/UI sin rechazar la fila. */
export function truncateToLimit(value: string, max: number): string {
  if (max <= 0 || value.length <= max) return value;
  return value.slice(0, max);
}

function isValidCalendarYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [ys, ms, ds] = ymd.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidDateYmd(value: string): boolean {
  return isValidCalendarYmd(value.trim());
}

/**
 * Normaliza fechas de Excel a YYYY-MM-DD.
 * Acepta: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (día/mes flexibles).
 * Preferencia Latam: DD/MM cuando ambos ≤ 12.
 */
export function parseFlexibleDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return isValidCalendarYmd(v) ? v : null;
  }

  // YYYY/MM/DD o YYYY.MM.DD
  const ymdSep = v.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (ymdSep) {
    const ymd = `${ymdSep[1]}-${ymdSep[2].padStart(2, '0')}-${ymdSep[3].padStart(2, '0')}`;
    return isValidCalendarYmd(ymd) ? ymd : null;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (formato habitual en plantillas Chile)
  const dmy = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = Number(dmy[3]);
    // Si el primer número > 12, solo puede ser día → DD/MM
    // Si el segundo > 12, solo puede ser MM/DD (raro en Latam) → reinterpretar
    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      // Ambiguo invertido: tratar como MM/DD
      month = a;
      day = b;
    }
    const ymd = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return isValidCalendarYmd(ymd) ? ymd : null;
  }

  return null;
}

export function buildNameMap<T extends { id: string; nombre: string }>(
  items: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(normKey(item.nombre), item);
  }
  return map;
}

export function resolveNames(
  names: string[],
  map: Map<string, { id: string; nombre: string }>,
  label: string
): { ids: string[]; errors: string[] } {
  const ids: string[] = [];
  const errors: string[] = [];
  for (const name of names) {
    const found = map.get(normKey(name));
    if (!found) {
      errors.push(`${label} no encontrado: "${name}"`);
    } else {
      ids.push(found.id);
    }
  }
  return { ids, errors };
}

export function headerIndexMap(
  headers: unknown[]
): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const key = cellStr(h);
    if (key) map.set(normKey(key), i);
  });
  return map;
}

export function getCol(
  row: unknown[],
  idx: Map<string, number>,
  header: string
): string {
  const i = idx.get(normKey(header));
  if (i == null) return '';
  return cellStr(row[i]);
}
