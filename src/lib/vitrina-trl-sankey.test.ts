import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaTrlSankey,
  layoutVitrinaTrlSankey,
} from '@/lib/vitrina-trl-sankey';

function projectsFrom(
  rows: Array<{
    nombre: string;
    trlInicial?: number | null;
    trlProyeccion?: number | null;
    trlFinal?: number | null;
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('buildVitrinaTrlSankey', () => {
  it('agrega flujos de TRL Inicial a Proyección y omite proyectos incompletos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'B', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'C', trlInicial: 3, trlProyeccion: 5 },
      { nombre: 'D', trlInicial: 2 },
      { nombre: 'E', trlProyeccion: 6 },
    ]);

    const sankey = buildVitrinaTrlSankey(proyectos, 'proyeccion');

    expect(sankey.included).toBe(3);
    expect(sankey.omitted).toBe(2);
    expect(sankey.links).toEqual([
      { from: 2, to: 4, value: 2, nombres: ['A', 'B'] },
      { from: 3, to: 5, value: 1, nombres: ['C'] },
    ]);
    expect(sankey.fromLevels).toEqual([
      { level: 2, value: 2 },
      { level: 3, value: 1 },
    ]);
    expect(sankey.toLevels).toEqual([
      { level: 4, value: 2 },
      { level: 5, value: 1 },
    ]);
  });

  it('usa TRL Final cuando el destino es final', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', trlInicial: 1, trlProyeccion: 3, trlFinal: 7 },
      { nombre: 'B', trlInicial: 1, trlProyeccion: 4 },
    ]);

    const sankey = buildVitrinaTrlSankey(proyectos, 'final');

    expect(sankey.included).toBe(1);
    expect(sankey.omitted).toBe(1);
    expect(sankey.links).toEqual([
      { from: 1, to: 7, value: 1, nombres: ['A'] },
    ]);
  });
});

describe('layoutVitrinaTrlSankey', () => {
  it('coloca nodos de origen a la izquierda y destino a la derecha', () => {
    const layout = layoutVitrinaTrlSankey(
      {
        included: 3,
        omitted: 0,
        fromLevels: [
          { level: 2, value: 2 },
          { level: 3, value: 1 },
        ],
        toLevels: [
          { level: 4, value: 2 },
          { level: 5, value: 1 },
        ],
        links: [
          { from: 2, to: 4, value: 2, nombres: ['A', 'B'] },
          { from: 3, to: 5, value: 1, nombres: ['C'] },
        ],
      },
      { width: 800, height: 400 },
    );

    expect(layout.fromNodes[0].x).toBeLessThan(layout.toNodes[0].x);
    expect(layout.links).toHaveLength(2);
    expect(layout.links[0].d.startsWith('M')).toBe(true);
    expect(layout.links[0].thickness).toBeGreaterThan(layout.links[1].thickness);
  });
});
