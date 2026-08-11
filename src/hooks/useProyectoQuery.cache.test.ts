import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
  indicadoresKey,
  proyectoDetailQueryFilters,
} from '@/lib/query-keys';
import { removeProyectoDetailQueries } from '@/hooks/useProyectoQuery';

describe('removeProyectoDetailQueries', () => {
  it('removes all known per-project query keys', () => {
    const qc = new QueryClient();
    const id = 'proj-1';
    qc.setQueryData(proyectoBaseKey(id), { id });
    qc.setQueryData(proyectoActivitiesKey(id), []);
    qc.setQueryData(indicadoresKey(id), {});
    qc.setQueryData(proyectoBaseKey('other'), { id: 'other' });

    removeProyectoDetailQueries(qc, id);

    expect(qc.getQueryData(proyectoBaseKey(id))).toBeUndefined();
    expect(qc.getQueryData(proyectoActivitiesKey(id))).toBeUndefined();
    expect(qc.getQueryData(indicadoresKey(id))).toBeUndefined();
    expect(qc.getQueryData(proyectoBaseKey('other'))).toEqual({ id: 'other' });
  });

  it('covers expected filter prefixes', () => {
    const filters = proyectoDetailQueryFilters('x');
    expect(filters.length).toBeGreaterThanOrEqual(8);
    expect(filters.some((f) => f.queryKey[0] === 'proyecto')).toBe(true);
    expect(filters.some((f) => f.queryKey[0] === 'historial')).toBe(true);
  });
});
