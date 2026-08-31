import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaIgipSankey,
  formatIgipBin,
  igipBinStart,
  layoutVitrinaIgipSankey,
} from '@/lib/vitrina-igip-sankey';

function projectsFrom(
  rows: Array<{
    nombre: string;
    igipInicial?: number | null;
    igipProyeccion?: number | null;
    igipFinal?: number | null;
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('igipBinStart / formatIgipBin', () => {
  it('agrupa valores en tramos de 0.25', () => {
    expect(igipBinStart(1.5)).toBe(1.5);
    expect(igipBinStart(1.6)).toBe(1.5);
    expect(igipBinStart(1.749)).toBe(1.5);
    expect(igipBinStart(1.75)).toBe(1.75);
    expect(formatIgipBin(1.5)).toBe('1.5-1.75');
    expect(formatIgipBin(2.75)).toBe('2.75-3');
  });
});

describe('buildVitrinaIgipSankey', () => {
  it('agrupa flujos por tramos de 0.25 y omite incompletos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', igipInicial: 1.6, igipProyeccion: 2.1 },
      { nombre: 'B', igipInicial: 1.7, igipProyeccion: 2.2 },
      { nombre: 'C', igipInicial: 3, igipProyeccion: 4 },
      { nombre: 'D', igipInicial: 2 },
    ]);

    const sankey = buildVitrinaIgipSankey(proyectos, 'proyeccion');

    expect(sankey.included).toBe(3);
    expect(sankey.omitted).toBe(1);
    expect(sankey.links).toEqual([
      {
        from: 1.5,
        to: 2,
        value: 2,
        nombres: ['A', 'B'],
      },
      {
        from: 3,
        to: 4,
        value: 1,
        nombres: ['C'],
      },
    ]);
    expect(sankey.fromLevels).toEqual([
      { level: 1.5, value: 2 },
      { level: 3, value: 1 },
    ]);
  });

  it('usa IGIP Final cuando el destino es final', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', igipInicial: 1.2, igipProyeccion: 2, igipFinal: 3.6 },
      { nombre: 'B', igipInicial: 1.2, igipProyeccion: 2 },
    ]);

    const sankey = buildVitrinaIgipSankey(proyectos, 'final');

    expect(sankey.included).toBe(1);
    expect(sankey.links).toEqual([
      { from: 1, to: 3.5, value: 1, nombres: ['A'] },
    ]);
  });
});

describe('layoutVitrinaIgipSankey', () => {
  it('alinea el mismo tramo IGIP a la misma altura en ambas columnas', () => {
    const layout = layoutVitrinaIgipSankey(
      {
        included: 3,
        omitted: 0,
        fromLevels: [
          { level: 1.5, value: 2 },
          { level: 2, value: 1 },
        ],
        toLevels: [
          { level: 2, value: 1 },
          { level: 2.5, value: 1 },
          { level: 2.75, value: 1 },
        ],
        links: [
          { from: 1.5, to: 2.5, value: 1, nombres: ['A'] },
          { from: 1.5, to: 2.75, value: 1, nombres: ['B'] },
          { from: 2, to: 2, value: 1, nombres: ['C'] },
        ],
      },
      { width: 800, height: 400 },
    );

    const from2 = layout.fromNodes.find((n) => n.level === 2)!;
    const to2 = layout.toNodes.find((n) => n.level === 2)!;
    const toHigh = layout.toNodes.find((n) => n.level === 2.75)!;

    expect(from2.y + from2.height / 2).toBeCloseTo(to2.y + to2.height / 2);
    expect(toHigh.y).toBeLessThan(from2.y);
  });
});
