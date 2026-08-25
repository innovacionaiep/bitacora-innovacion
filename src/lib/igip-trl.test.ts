import { describe, expect, it } from 'vitest';
import {
  IGIP_SUBDIMENSIONS,
  TRL_LEVELS,
  describeIgipTrlCambio,
  radarPolygonPoints,
  radarValue,
  radarVertex,
  trlRowAppearance,
  nextTrlOnClick,
  validateIgipTrlPatch,
} from '@/lib/igip-trl';

describe('IGIP-TRL catalog', () => {
  it('defines six subdimensions in radar order', () => {
    expect(IGIP_SUBDIMENSIONS.map((d) => d.label)).toEqual([
      'Originalidad',
      'Estado del Arte',
      'Contribución Social, Ambiental o Productiva',
      'Contribución al Conocimiento',
      'Potencial de Expansión',
      'Transferencia Tecnológica',
    ]);
  });

  it('defines TRL 1–7 with copy', () => {
    expect(TRL_LEVELS.map((t) => t.level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(TRL_LEVELS[0].description).toBe(
      'Principios básicos e ideas iniciales'
    );
    expect(TRL_LEVELS[6].description).toBe(
      'Demostración de sistema completo en entorno operativo'
    );
  });
});

describe('validateIgipTrlPatch', () => {
  it('accepts integers 0–4, finite IGIP and TRL 1–7', () => {
    expect(
      validateIgipTrlPatch({
        originalidad: 0,
        estadoDelArte: 4,
        igip: 2.35,
        trl: 7,
      })
    ).toEqual({ ok: true });
  });

  it('accepts nulls as unset', () => {
    expect(
      validateIgipTrlPatch({
        originalidad: null,
        igip: null,
        trl: null,
      })
    ).toEqual({ ok: true });
  });

  it('rejects out of range scores and TRL', () => {
    expect(validateIgipTrlPatch({ originalidad: 5 }).ok).toBe(false);
    expect(validateIgipTrlPatch({ originalidad: 1.5 }).ok).toBe(false);
    expect(validateIgipTrlPatch({ trl: 0 }).ok).toBe(false);
    expect(validateIgipTrlPatch({ trl: 8 }).ok).toBe(false);
    expect(validateIgipTrlPatch({ igip: Number.NaN }).ok).toBe(false);
  });
});

describe('radar math', () => {
  it('maps null to 0 so the polygon stays closed', () => {
    expect(radarValue(null)).toBe(0);
    expect(radarValue(3)).toBe(3);
  });

  it('places the first axis pointing up at full radius when score is 4', () => {
    const p = radarVertex(0, 4, { count: 6, cx: 100, cy: 100, radius: 80 });
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(20, 5);
  });

  it('builds six SVG points', () => {
    const points = radarPolygonPoints([4, 0, 0, 0, 0, 0], {
      cx: 100,
      cy: 100,
      radius: 80,
    });
    expect(points.split(' ')).toHaveLength(6);
    expect(points.startsWith('100.00,20.00')).toBe(true);
  });
});

describe('trlRowAppearance', () => {
  it('highlights only the selected TRL', () => {
    expect(trlRowAppearance(4, 4)).toBe('selected');
    expect(trlRowAppearance(3, 4)).toBe('muted');
    expect(trlRowAppearance(4, null)).toBe('muted');
  });
});

describe('nextTrlOnClick', () => {
  it('selects a new TRL and clears it when clicked again', () => {
    expect(nextTrlOnClick(4, null)).toBe(4);
    expect(nextTrlOnClick(4, 4)).toBe(null);
    expect(nextTrlOnClick(5, 4)).toBe(5);
  });
});

describe('describeIgipTrlCambio', () => {
  it('describes a TRL assignment', () => {
    expect(describeIgipTrlCambio({ trl: 5 })).toEqual({
      elemento: 'TRL',
      cambio: 'Asignó TRL 5',
    });
  });

  it('describes clearing a TRL', () => {
    expect(describeIgipTrlCambio({ trl: null })).toEqual({
      elemento: 'TRL',
      cambio: 'Quitó el nivel TRL',
    });
  });
});
