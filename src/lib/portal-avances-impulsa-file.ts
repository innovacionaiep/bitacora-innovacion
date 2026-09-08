import fs from 'node:fs/promises';
import path from 'node:path';

export const IMPULSA_SYNC_LOCAL_ONLY =
  'La actualización del Excel solo está disponible en local (el archivo de OneDrive no existe en el servidor).';

export function isImpulsaExcelCloudRuntime(): boolean {
  return process.env.VERCEL === '1';
}

export function validateImpulsaExcelPath(
  raw: string,
): { ok: true; filePath: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'La ruta del archivo es obligatoria' };
  }
  if (trimmed.includes('\0')) {
    return { ok: false, error: 'Ruta inválida' };
  }
  const resolved = path.resolve(trimmed);
  if (!/\.xlsx$/i.test(resolved)) {
    return { ok: false, error: 'El archivo debe ser .xlsx' };
  }
  return { ok: true, filePath: resolved };
}

export async function readImpulsaExcelFile(
  rawPath: string,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  if (isImpulsaExcelCloudRuntime()) {
    return { ok: false, error: IMPULSA_SYNC_LOCAL_ONLY };
  }
  const validated = validateImpulsaExcelPath(rawPath);
  if (!validated.ok) return validated;
  try {
    const buffer = await fs.readFile(validated.filePath);
    return { ok: true, buffer };
  } catch {
    return {
      ok: false,
      error: `No se encontró el archivo en el disco: ${validated.filePath}`,
    };
  }
}
