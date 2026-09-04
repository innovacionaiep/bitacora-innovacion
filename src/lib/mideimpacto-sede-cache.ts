import prisma from '@/lib/prisma';
import {
  applySedesToRows,
  type MideimpactoIniciativasPage,
} from '@/lib/mideimpacto-iniciativas';

export const SEDE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SedeCacheRow = {
  inicCodigo: string;
  sedeNombres: string;
  fetchedAt: Date;
};

export type SedeCacheStore = {
  findByCodigos(ids: string[]): Promise<SedeCacheRow[]>;
  upsert(inicCodigo: string, sedeNombres: string): Promise<void>;
};

export function idsNeedingSedeRefresh(
  ids: string[],
  cached: SedeCacheRow[],
  now: number = Date.now(),
  ttlMs: number = SEDE_CACHE_TTL_MS,
): string[] {
  const byId = new Map(cached.map((row) => [row.inicCodigo, row]));
  return ids.filter((id) => {
    const hit = byId.get(id);
    if (!hit) return true;
    return now - hit.fetchedAt.getTime() > ttlMs;
  });
}

type SedeCacheDelegate = {
  findMany: (args: {
    where: { inicCodigo: { in: string[] } };
  }) => Promise<SedeCacheRow[]>;
  upsert: (args: {
    where: { inicCodigo: string };
    create: {
      inicCodigo: string;
      sedeNombres: string;
      fetchedAt: Date;
    };
    update: { sedeNombres: string; fetchedAt: Date };
  }) => Promise<unknown>;
};

function sedeCacheTable(): SedeCacheDelegate {
  return (
    prisma as unknown as { mideimpactoIniciativaSedeCache: SedeCacheDelegate }
  ).mideimpactoIniciativaSedeCache;
}

export const prismaSedeCacheStore: SedeCacheStore = {
  async findByCodigos(ids) {
    if (ids.length === 0) return [];
    return sedeCacheTable().findMany({
      where: { inicCodigo: { in: ids } },
    });
  },
  async upsert(inicCodigo, sedeNombres) {
    await sedeCacheTable().upsert({
      where: { inicCodigo },
      create: { inicCodigo, sedeNombres, fetchedAt: new Date() },
      update: { sedeNombres, fetchedAt: new Date() },
    });
  },
};

export async function attachSedesFromCache(
  page: MideimpactoIniciativasPage,
  store: SedeCacheStore = prismaSedeCacheStore,
): Promise<{ page: MideimpactoIniciativasPage; missingIds: string[] }> {
  const ids = [...new Set(page.rows.map((row) => row.id.trim()).filter(Boolean))];
  if (ids.length === 0) return { page, missingIds: [] };
  try {
    const cached = await store.findByCodigos(ids);
    const sedes: Record<string, string> = {};
    for (const row of cached) {
      if (row.sedeNombres.trim()) sedes[row.inicCodigo] = row.sedeNombres;
    }
    return {
      page: { ...page, rows: applySedesToRows(page.rows, sedes) },
      missingIds: idsNeedingSedeRefresh(ids, cached),
    };
  } catch {
    return { page, missingIds: ids };
  }
}
