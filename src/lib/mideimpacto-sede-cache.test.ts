import { describe, expect, it } from 'vitest';
import type { MideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';
import { applySedesToRows } from '@/lib/mideimpacto-iniciativas';
import {
  SEDE_CACHE_TTL_MS,
  attachSedesFromCache,
  idsNeedingSedeRefresh,
  type SedeCacheRow,
  type SedeCacheStore,
} from '@/lib/mideimpacto-sede-cache';

function row(
  patch: Partial<MideimpactoIniciativa> & Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    estado: 'Activa',
    fechaInicio: '',
    fechaTermino: '',
    mecanismo: '',
    adjuntos: [],
    sede: '',
    ...patch,
  };
}

describe('idsNeedingSedeRefresh', () => {
  const now = Date.parse('2026-09-04T00:00:00.000Z');

  it('pide IDs ausentes y deja pasar los frescos aunque sede esté vacía', () => {
    const cached: SedeCacheRow[] = [
      { inicCodigo: '1', sedeNombres: '', fetchedAt: new Date(now - 1000) },
      {
        inicCodigo: '2',
        sedeNombres: 'Viña',
        fetchedAt: new Date(now - SEDE_CACHE_TTL_MS - 1),
      },
    ];
    expect(idsNeedingSedeRefresh(['1', '2', '3'], cached, now)).toEqual(['2', '3']);
  });
});

describe('attachSedesFromCache', () => {
  it('une sedes de caché y lista missing sin llamar al detalle', async () => {
    const store: SedeCacheStore = {
      findByCodigos: async () => [
        {
          inicCodigo: '12',
          sedeNombres: 'Casa Central',
          fetchedAt: new Date(),
        },
      ],
      upsert: async () => {},
    };
    const page = {
      rows: [row({ id: '12', nombre: 'A' }), row({ id: '13', nombre: 'B' })],
      page: 1,
      lastPage: 1,
      total: 2,
    };
    const result = await attachSedesFromCache(page, store);
    expect(result.page.rows[0]).toMatchObject({
      sede: 'Casa Central',
    });
    expect(result.missingIds).toEqual(['13']);
    expect(applySedesToRows(page.rows, { '12': 'Casa Central' })[0]?.sede).toBe(
      'Casa Central',
    );
  });

  it('si la caché falla, no tumba el listado y marca todos como missing', async () => {
    const store: SedeCacheStore = {
      findByCodigos: async () => {
        throw new Error('db down');
      },
      upsert: async () => {},
    };
    const page = {
      rows: [row({ id: '12', nombre: 'A' })],
      page: 1,
      lastPage: 1,
      total: 1,
    };
    const result = await attachSedesFromCache(page, store);
    expect(result.page.rows[0]?.nombre).toBe('A');
    expect(result.missingIds).toEqual(['12']);
  });
});
