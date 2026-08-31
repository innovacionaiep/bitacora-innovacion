import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import { radarPolygonPoints } from '@/lib/igip-trl';
import {
  averageStadiumScores,
  buildVitrinaIgipRadar,
  formatIgipRadarScore,
  resolveRadarProjects,
} from '@/lib/vitrina-igip-radar';

function projectsFrom(
  rows: Array<Record<string, unknown> & { nombre: string; id?: string }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('vitrina-igip-radar', () => {
  it('selector vacío usa todos; ids desconocidos caen a todos', () => {
    const proyectos = projectsFrom([
      { id: 'a', nombre: 'A' },
      { id: 'b', nombre: 'B' },
    ]);
    expect(resolveRadarProjects(proyectos, [])).toEqual(proyectos);
    expect(resolveRadarProjects(proyectos, ['z'])).toEqual(proyectos);
    expect(resolveRadarProjects(proyectos, ['b']).map((p) => p.id)).toEqual([
      'b',
    ]);
  });

  it('promedia solo no-nulos y deja 0 si el eje no tiene valores', () => {
    const proyectos = projectsFrom([
      { id: 'a', nombre: 'A', igipInicialOriginalidad: 2 },
      { id: 'b', nombre: 'B', igipInicialOriginalidad: 4 },
      { id: 'c', nombre: 'C' },
    ]);
    const scores = averageStadiumScores(proyectos, 'inicial');
    expect(scores[0]).toBe(3);
    expect(scores[1]).toBe(0);
  });

  it('verde es Inicial del selector; rojo el destino; azul Inicial de todos', () => {
    const proyectos = projectsFrom([
      {
        id: 'a',
        nombre: 'A',
        igipInicialOriginalidad: 2,
        igipProyeccionOriginalidad: 3,
        igipFinalOriginalidad: 4,
      },
      {
        id: 'b',
        nombre: 'B',
        igipInicialOriginalidad: 4,
        igipProyeccionOriginalidad: 1,
        igipFinalOriginalidad: 2,
      },
    ]);

    const none = buildVitrinaIgipRadar({
      proyectos,
      selectedIds: [],
      target: 'proyeccion',
      showPromedio: false,
    });
    expect(none.layers.map((l) => l.id)).toEqual(['destino', 'inicial']);
    expect(none.layers[0]?.scores[0]).toBe(2);
    expect(none.layers[1]?.scores[0]).toBe(3);
    expect(none.layers[0]?.stroke).toBe('#dc2626');
    expect(none.layers[1]?.stroke).toBe('#059669');
    expect(none.layers[0]?.fill).toContain('0.14');
    expect(none.layers[1]?.fill).toContain('0.22');

    const one = buildVitrinaIgipRadar({
      proyectos,
      selectedIds: ['a'],
      target: 'final',
      showPromedio: true,
    });
    expect(one.asAverage).toBe(false);
    expect(one.layers[0]?.scores[0]).toBe(4);
    expect(one.layers[1]?.scores[0]).toBe(2);
    const blue = one.layers.find((l) => l.id === 'promedio');
    expect(blue?.scores[0]).toBe(3);
    expect(blue?.stroke).toBe('#2563eb');
  });

  it('formatea entero si hay un proyecto y un decimal si es promedio', () => {
    expect(formatIgipRadarScore(2, false)).toBe('2');
    expect(formatIgipRadarScore(2.5, true)).toBe('2.5');
  });

  it('el polígono de un promedio decimal no colapsa al centro', () => {
    const proyectos = projectsFrom([
      { id: 'a', nombre: 'A', igipInicialOriginalidad: 2 },
      { id: 'b', nombre: 'B', igipInicialOriginalidad: 3 },
    ]);
    const built = buildVitrinaIgipRadar({
      proyectos,
      selectedIds: [],
      target: 'proyeccion',
      showPromedio: false,
    });
    const green = built.layers.find((layer) => layer.id === 'inicial');
    expect(green?.scores[0]).toBe(2.5);
    const points = radarPolygonPoints(green!.scores, {
      cx: 160,
      cy: 160,
      radius: 148,
    });
    const first = points.split(' ')[0]!;
    const y = Number(first.split(',')[1]);
    expect(y).toBeLessThan(160);
  });
});
