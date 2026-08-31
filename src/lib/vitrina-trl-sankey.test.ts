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
    const fromHigh = layout.fromNodes.find((n) => n.level === 3)!;
    const fromLow = layout.fromNodes.find((n) => n.level === 2)!;
    expect(fromHigh.y).toBeLessThan(fromLow.y);
    const toHigh = layout.toNodes.find((n) => n.level === 5)!;
    const toLow = layout.toNodes.find((n) => n.level === 4)!;
    expect(toHigh.y).toBeLessThan(toLow.y);
  });

  it('traza una guía horizontal entre los centros del mismo nivel', () => {
    const layout = layoutVitrinaTrlSankey(
      {
        included: 3,
        omitted: 0,
        fromLevels: [
          { level: 2, value: 2 },
          { level: 5, value: 1 },
        ],
        toLevels: [
          { level: 5, value: 2 },
          { level: 7, value: 1 },
        ],
        links: [
          { from: 5, to: 7, value: 1, nombres: ['A'] },
          { from: 2, to: 5, value: 2, nombres: ['B', 'B2'] },
        ],
      },
      { width: 800, height: 400 },
    );

    const guide5 = layout.guides.find((g) => g.level === 5)!;
    const from5 = layout.fromNodes.find((n) => n.level === 5)!;
    const to5 = layout.toNodes.find((n) => n.level === 5)!;
    const guide7 = layout.guides.find((g) => g.level === 7)!;
    const to7 = layout.toNodes.find((n) => n.level === 7)!;

    expect(guide5.y).toBeCloseTo(from5.y + from5.height / 2);
    expect(guide5.y).toBeCloseTo(to5.y + to5.height / 2);
    expect(guide5.x1).toBeCloseTo(from5.x + from5.width / 2);
    expect(guide5.x2).toBeCloseTo(to5.x + to5.width / 2);
    expect(guide7.y).toBeCloseTo(to7.y + to7.height / 2);
    expect(guide7.x1).toBeLessThan(guide7.x2);
  });

  it('alinea el mismo nivel a la misma altura y deja los destinos más altos arriba', () => {
    const layout = layoutVitrinaTrlSankey(
      {
        included: 6,
        omitted: 0,
        fromLevels: [
          { level: 1, value: 1 },
          { level: 2, value: 3 },
          { level: 3, value: 1 },
          { level: 4, value: 1 },
          { level: 5, value: 1 },
        ],
        toLevels: [
          { level: 3, value: 1 },
          { level: 4, value: 1 },
          { level: 5, value: 2 },
          { level: 6, value: 1 },
          { level: 7, value: 1 },
        ],
        links: [
          { from: 5, to: 7, value: 1, nombres: ['A'] },
          { from: 4, to: 6, value: 1, nombres: ['B'] },
          { from: 2, to: 5, value: 2, nombres: ['C', 'D'] },
          { from: 3, to: 5, value: 1, nombres: ['E'] },
          { from: 1, to: 3, value: 1, nombres: ['F'] },
        ],
      },
      { width: 800, height: 400 },
    );

    const fromByLevel = new Map(layout.fromNodes.map((n) => [n.level, n]));
    const toByLevel = new Map(layout.toNodes.map((n) => [n.level, n]));
    const midY = (node: { y: number; height: number }) =>
      node.y + node.height / 2;

    expect(midY(fromByLevel.get(5)!)).toBeCloseTo(midY(toByLevel.get(5)!));
    expect(midY(fromByLevel.get(4)!)).toBeCloseTo(midY(toByLevel.get(4)!));
    expect(midY(fromByLevel.get(3)!)).toBeCloseTo(midY(toByLevel.get(3)!));
    expect(fromByLevel.get(5)!.height).not.toBe(toByLevel.get(5)!.height);

    expect(toByLevel.get(7)!.y).toBeLessThan(toByLevel.get(6)!.y);
    expect(toByLevel.get(6)!.y).toBeLessThan(toByLevel.get(5)!.y);
    expect(toByLevel.get(7)!.y).toBeLessThan(fromByLevel.get(5)!.y);
    expect(fromByLevel.get(2)!.y).toBeGreaterThan(toByLevel.get(3)!.y);
  });
});
