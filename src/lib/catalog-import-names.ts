/** Nombres de la primera columna de un Excel (filas tipo sheet_to_json header:1). */
export function parseCatalogNamesFromSheetRows(rows: unknown[][]): string[] {
  if (rows.length === 0) return [];
  const firstCell = String(rows[0]?.[0] ?? '')
    .trim()
    .toLowerCase();
  const isHeader =
    rows.length > 1 &&
    (firstCell === 'nombre' ||
      firstCell === 'etiqueta' ||
      firstCell === 'etiquetas');
  const dataRows = isHeader ? rows.slice(1) : rows;
  return dataRows
    .map((row) => String((row && row[0]) ?? '').trim())
    .filter(Boolean);
}

/**
 * Nombres nuevos a insertar: únicos por minúsculas, sin los que ya están
 * en el catálogo (también case-insensitive). Conserva el primer casing visto.
 */
export function namesToImportAgainstExisting(
  incoming: string[],
  existing: string[],
): { toCreate: string[]; skipped: number } {
  const existingKeys = new Set(
    existing.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  const seenIncoming = new Set<string>();
  const uniqueIncoming: string[] = [];
  for (const raw of incoming) {
    const trimmed =
      typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seenIncoming.has(key)) continue;
    seenIncoming.add(key);
    uniqueIncoming.push(trimmed);
  }

  const toCreate: string[] = [];
  let skipped = 0;
  for (const nombre of uniqueIncoming) {
    if (existingKeys.has(nombre.toLowerCase())) {
      skipped += 1;
      continue;
    }
    toCreate.push(nombre);
  }
  return { toCreate, skipped };
}
