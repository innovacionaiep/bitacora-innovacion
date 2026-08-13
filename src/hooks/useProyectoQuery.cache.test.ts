import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  proyectoBaseKey,
  proyectoActivitiesKey,
  indicadoresKey,
  presupuestoKey,
  proyectoParticipantesKey,
  reunionesKey,
  historialKey,
  historialFiltrosKey,
  escalamientoKey,
  proyectoDetailQueryFilters,
  proyectoTabDataPrefetchKeys,
} from '@/lib/query-keys';
import {
  removeProyectoDetailQueries,
  proyectoNeedsDesarrolloTecnicoFetch,
  setProyectoBaseCache,
  isPrefetchableProyectoTab,
  mergeDesarrolloTecnicoIntoProject,
  ALL_PREFETCH_TABS,
} from '@/hooks/useProyectoQuery';
import {
  GET_PROYECTO_BASE_OPTIONS,
  GET_ACTIVITIES_LIST_SELECT,
  GET_ACTIVITIES_INCLUDE_EVIDENCIAS_COUNT,
  GET_PROYECTO_SCALAR_SELECT,
  PROYECTO_DETAIL_LRU_KEEP,
  touchProyectoDetailLru,
  shellProyectoFromListado,
  isProyectoGeneralShell,
  isConvenioTabPendiente,
} from '@/lib/proyecto-detail-cache';
import type { ProyectoWithRelations } from '@/types/proyecto';

describe('GET_PROYECTO_SCALAR_SELECT', () => {
  it('selects General scalars without relation blobs', () => {
    expect(GET_PROYECTO_SCALAR_SELECT.id).toBe(true);
    expect(GET_PROYECTO_SCALAR_SELECT.proyecto).toBe(true);
    expect(GET_PROYECTO_SCALAR_SELECT.convenioFirmadoUrl).toBe(true);
    expect(Object.keys(GET_PROYECTO_SCALAR_SELECT)).not.toContain('activities');
    expect(Object.keys(GET_PROYECTO_SCALAR_SELECT)).not.toContain('historial');
  });
});

describe('GET_PROYECTO_BASE_OPTIONS', () => {
  it('skips desarrollo técnico, activities and participantes', () => {
    expect(GET_PROYECTO_BASE_OPTIONS.includeDesarrolloTecnico).toBe(false);
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
  it('covers Gantt, indicadores, presupuesto and remaining tabs', () => {
    const keys = proyectoTabDataPrefetchKeys('proj-1');
    expect(keys).toEqual([
      proyectoActivitiesKey('proj-1'),
      indicadoresKey('proj-1'),
      presupuestoKey('proj-1'),
      proyectoParticipantesKey('proj-1'),
      reunionesKey('proj-1'),
      historialKey('proj-1', {}),
      historialFiltrosKey('proj-1'),
      escalamientoKey('proj-1'),
    ]);
  });
});

describe('ALL_PREFETCH_TABS', () => {
  it('prefetches in pairs: participantes+gantt, indicadores+presupuesto, seguimiento+escalamiento, convenio+historial', () => {
    expect(ALL_PREFETCH_TABS).toEqual([
      'Participantes',
      'Gantt',
      'Indicadores',
      'Presupuesto',
      'Seguimiento',
      'Escalamiento',
      'Convenio',
      'Historial',
    ]);
  });
});

describe('isPrefetchableProyectoTab', () => {
  it('includes Convenio and the idle-prefetch pairs, not General', () => {
    expect(isPrefetchableProyectoTab('Participantes')).toBe(true);
    expect(isPrefetchableProyectoTab('Gantt')).toBe(true);
    expect(isPrefetchableProyectoTab('Indicadores')).toBe(true);
    expect(isPrefetchableProyectoTab('Presupuesto')).toBe(true);
    expect(isPrefetchableProyectoTab('Seguimiento')).toBe(true);
    expect(isPrefetchableProyectoTab('Escalamiento')).toBe(true);
    expect(isPrefetchableProyectoTab('Convenio')).toBe(true);
    expect(isPrefetchableProyectoTab('Historial')).toBe(true);
    expect(isPrefetchableProyectoTab('General')).toBe(false);
    expect(isPrefetchableProyectoTab('Resumen')).toBe(false);
  });
});

describe('shellProyectoFromListado', () => {
  it('does not write shell into proyectoBaseKey and needs DT fetch', () => {
    const shell = shellProyectoFromListado({
      id: 'p1',
      proyecto: 'Demo',
      sede: 'Santiago',
      fondo: 'Fondo A',
      escuelas: [{ escuela: { nombre: 'Escuela 1' } }],
    });
    expect(isProyectoGeneralShell(shell)).toBe(true);
    expect(proyectoNeedsDesarrolloTecnicoFetch(shell)).toBe(true);
    expect('desarrolloTecnico' in shell).toBe(false);
    expect(shell.proyecto).toBe('Demo');
    expect(shell.fondo).toBe('Fondo A');
    expect(shell.sede).toBe('Santiago');
    expect(shell.escuelas[0]?.escuela.nombre).toBe('Escuela 1');

    const qc = new QueryClient();
    setProyectoBaseCache(qc, shell);
    expect(qc.getQueryData(proyectoBaseKey('p1'))).toBeUndefined();
  });

  it('caches a non-shell base without waiting for DT', () => {
    const base = { id: 'p1', proyecto: 'Demo' } as ProyectoWithRelations;
    expect(isProyectoGeneralShell(base)).toBe(false);
    const qc = new QueryClient();
    setProyectoBaseCache(qc, base);
    expect(qc.getQueryData(proyectoBaseKey('p1'))).toEqual(base);
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

describe('isConvenioTabPendiente', () => {
  it('is false on the listado shell even if convenioFirmadoUrl is empty', () => {
    const shell = shellProyectoFromListado({
      id: 'p1',
      proyecto: 'Demo',
      sede: 'Santiago',
      fondo: 'Fondo A',
      escuelas: [],
    });
    expect(isConvenioTabPendiente(shell)).toBe(false);
  });

  it('is true only after base load when the project has no signed convenio', () => {
    const loaded = {
      id: 'p1',
      convenioFirmadoUrl: null,
    } as ProyectoWithRelations;
    expect(isConvenioTabPendiente(loaded)).toBe(true);
  });

  it('is false when a signed convenio URL is present', () => {
    const signed = {
      id: 'p1',
      convenioFirmadoUrl: 'https://example.com/c.pdf',
    } as ProyectoWithRelations;
    expect(isConvenioTabPendiente(signed)).toBe(false);
  });
});

describe('mergeDesarrolloTecnicoIntoProject', () => {
  it('adds DT and clears the general shell flag', () => {
    const shell = shellProyectoFromListado({
      id: 'p1',
      proyecto: 'Demo',
      sede: 'Santiago',
      fondo: 'Fondo A',
      escuelas: [],
    });
    const merged = mergeDesarrolloTecnicoIntoProject(shell, {
      desarrolloTecnico: null,
      desarrolloTecnicoValores: [],
    });
    expect(isProyectoGeneralShell(merged)).toBe(false);
    expect('desarrolloTecnico' in merged).toBe(true);
    expect(merged.desarrolloTecnico).toBeNull();
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

  it('covers expected filter prefixes including escalamiento', () => {
    const filters = proyectoDetailQueryFilters('x');
    expect(filters.length).toBeGreaterThanOrEqual(9);
    expect(filters.some((f) => f.queryKey[0] === 'proyecto')).toBe(true);
    expect(filters.some((f) => f.queryKey[0] === 'historial')).toBe(true);
    expect(filters.some((f) => f.queryKey[0] === 'escalamiento')).toBe(true);
  });

  it('LRU evict drops tab caches of the oldest id', () => {
    const qc = new QueryClient();
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    for (const id of ids) {
      qc.setQueryData(proyectoBaseKey(id), { id });
      qc.setQueryData(proyectoActivitiesKey(id), []);
      qc.setQueryData(indicadoresKey(id), {});
      qc.setQueryData(presupuestoKey(id), []);
      qc.setQueryData(proyectoParticipantesKey(id), []);
      qc.setQueryData(reunionesKey(id), []);
      qc.setQueryData(historialKey(id, {}), []);
      qc.setQueryData(historialFiltrosKey(id), {});
      qc.setQueryData(escalamientoKey(id), {});
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
    expect(qc.getQueryData(proyectoParticipantesKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(reunionesKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(historialKey('p1', {}))).toBeUndefined();
    expect(qc.getQueryData(historialFiltrosKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(escalamientoKey('p1'))).toBeUndefined();
    expect(qc.getQueryData(proyectoBaseKey('p6'))).toEqual({ id: 'p6' });
    expect(qc.getQueryData(proyectoActivitiesKey('p6'))).toEqual([]);
    expect(qc.getQueryData(indicadoresKey('p6'))).toEqual({});
    expect(qc.getQueryData(presupuestoKey('p6'))).toEqual([]);
    expect(qc.getQueryData(escalamientoKey('p6'))).toEqual({});
  });
});
