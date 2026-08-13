import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
  indicadoresKey,
  presupuestoKey,
  proyectoDetailQueryFilters,
  proyectoTabDataPrefetchKeys,
} from '@/lib/query-keys';
import {
  removeProyectoDetailQueries,
  proyectoNeedsDesarrolloTecnicoFetch,
} from '@/hooks/useProyectoQuery';
import {
  GET_PROYECTO_BASE_OPTIONS,
  GET_ACTIVITIES_LIST_SELECT,
  GET_ACTIVITIES_INCLUDE_EVIDENCIAS_COUNT,
  PROYECTO_DETAIL_LRU_KEEP,
  touchProyectoDetailLru,
} from '@/lib/proyecto-detail-cache';
import type { ProyectoWithRelations } from '@/types/proyecto';

describe('GET_PROYECTO_BASE_OPTIONS', () => {
  it('loads desarrollo técnico and skips activities and participantes', () => {
    expect(GET_PROYECTO_BASE_OPTIONS.includeDesarrolloTecnico).toBe(true);
    expect(GET_PROYECTO_BASE_OPTIONS.includeActivities).toBe(false);
    expect(GET_PROYECTO_BASE_OPTIONS.includeParticipantes).toBe(false);
  });
});

describe('GET_ACTIVITIES_LIST_SELECT', () => {
  it('does not request evidencias count', () => {
    expect(GET_ACTIVITIES_INCLUDE_EVIDENCIAS_COUNT).toBe(false);
    expect(JSON.stringify(GET_ACTIVITIES_LIST_SELECT)).not.toMatch(
      /evidencias/
    );
  });

  it('selects activity and task fields Gantt needs', () => {
    expect(GET_ACTIVITIES_LIST_SELECT.id).toBe(true);
    expect(GET_ACTIVITIES_LIST_SELECT.tasks.select.completed).toBe(true);
    expect(GET_ACTIVITIES_LIST_SELECT.tasks.select.startDate).toBe(true);
    expect(GET_ACTIVITIES_LIST_SELECT.tasks.orderBy).toEqual({
      createdAt: 'asc',
    });
  });
});

describe('proyectoTabDataPrefetchKeys', () => {
  it('covers activities, indicadores and presupuesto for one project', () => {
    const keys = proyectoTabDataPrefetchKeys('proj-1');
    expect(keys).toEqual([
      proyectoActivitiesKey('proj-1'),
      indicadoresKey('proj-1'),
      presupuestoKey('proj-1'),
    ]);
    expect(keys.some((k) => k[0] === 'historial')).toBe(false);
  });
});

describe('proyectoNeedsDesarrolloTecnicoFetch', () => {
  it('is false when base already includes the DT key (even if null)', () => {
    const withDt = {
      id: 'p1',
      desarrolloTecnico: null,
    } as ProyectoWithRelations;
    expect(proyectoNeedsDesarrolloTecnicoFetch(withDt)).toBe(false);
  });

  it('is true for a cache entry that never received DT', () => {
    const withoutDt = { id: 'p1' } as ProyectoWithRelations;
    expect(proyectoNeedsDesarrolloTecnicoFetch(withoutDt)).toBe(true);
  });
});

describe('touchProyectoDetailLru', () => {
  it('keeps the last N ids and evicts the oldest, without wiping the previous on select', () => {
    let recent: string[] = [];
    const keep = PROYECTO_DETAIL_LRU_KEEP;

    for (let i = 1; i <= keep; i++) {
      const next = touchProyectoDetailLru(recent, `p${i}`, keep);
      expect(next.evict).toEqual([]);
      recent = next.recent;
    }
    expect(recent).toEqual(['p5', 'p4', 'p3', 'p2', 'p1']);

    const afterSixth = touchProyectoDetailLru(recent, 'p6', keep);
    expect(afterSixth.evict).toEqual(['p1']);
    expect(afterSixth.recent).toEqual(['p6', 'p5', 'p4', 'p3', 'p2']);
    recent = afterSixth.recent;

    const reopenP5 = touchProyectoDetailLru(recent, 'p5', keep);
    expect(reopenP5.evict).toEqual([]);
    expect(reopenP5.recent).toEqual(['p5', 'p6', 'p4', 'p3', 'p2']);
  });

  it('does not evict when returning to an already-tracked project (deselect is a no-op on LRU)', () => {
    const recent = ['a', 'b', 'c'];
    const again = touchProyectoDetailLru(recent, 'a', 5);
    expect(again.evict).toEqual([]);
    expect(again.recent).toEqual(['a', 'b', 'c']);
    expect(recent).toEqual(['a', 'b', 'c']);
  });
});

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

  it('LRU evict drops tab caches (activities, indicadores, presupuesto) of the oldest id', () => {
    const qc = new QueryClient();
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    for (const id of ids) {
      qc.setQueryData(proyectoBaseKey(id), { id });
      qc.setQueryData(proyectoActivitiesKey(id), []);
      qc.setQueryData(indicadoresKey(id), {});
      qc.setQueryData(presupuestoKey(id), []);
    }

    let recent: string[] = [];
    for (const id of ids) {
      const next = touchProyectoDetailLru(recent, id, PROYECTO_DETAIL_LRU_KEEP);
      recent = next.recent;
      for (const evictId of next.evict) {
        removeProyectoDetailQueries(qc, evictId);
      }
    }

    expect(qc.getQueryData(proyectoBaseKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(proyectoActivitiesKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(indicadoresKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(presupuestoKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(proyectoBaseKey('p6'))).toEqual({ id: 'p6' });
    expect(qc.getQueryData(proyectoActivitiesKey('p6'))).toEqual([]);
    expect(qc.getQueryData(indicadoresKey('p6'))).toEqual({});
    expect(qc.getQueryData(presupuestoKey('p6'))).toEqual([]);
  });
});
