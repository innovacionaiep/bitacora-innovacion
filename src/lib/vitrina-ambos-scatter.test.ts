import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaAmbosScatter,
  layoutVitrinaAmbosLabels,
  layoutVitrinaAmbosScatter,
  vitrinaAmbosFillOpacity,
} from '@/lib/vitrina-ambos-scatter';

function projectsFrom(
  rows: Array<{
    nombre: string;
    fondos?: string[];
    trlInicial?: number | null;
    trlProyeccion?: number | null;
    trlFinal?: number | null;
    igipInicial?: number | null;
    igipProyeccion?: number | null;
    igipFinal?: number | null;
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('buildVitrinaAmbosScatter', () => {
  it('crea un punto inicial y uno de destino por proyecto, con el fondo de la tarjeta', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
        trlInicial: 2,
        trlProyeccion: 4,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      { nombre: 'B', trlInicial: 3, igipInicial: 2 },
      { nombre: 'C', trlInicial: 1 },
    ]);

    const scatter = buildVitrinaAmbosScatter(proyectos, 'proyeccion');

    expect(scatter.included).toBe(2);
    expect(scatter.omitted).toBe(1);
    expect(scatter.points).toEqual([
      expect.objectContaining({
        nombre: 'A',
        kind: 'inicial',
        trl: 2,
        igip: 1.5,
        fondo: 'Fondo Impulsa',
      }),
      expect.objectContaining({
        nombre: 'A',
        kind: 'destino',
        trl: 4,
        igip: 3,
        fondo: 'Fondo Impulsa',
      }),
      expect.objectContaining({
        nombre: 'B',
        kind: 'inicial',
        trl: 3,
        igip: 2,
      }),
    ]);
  });

  it('usa TRL e IGIP Final cuando el destino es final', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        trlInicial: 1,
        trlProyeccion: 3,
        trlFinal: 6,
        igipInicial: 1.2,
        igipProyeccion: 2,
        igipFinal: 4.5,
      },
      {
        nombre: 'B',
        trlInicial: 2,
        trlProyeccion: 4,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
    ]);

    const scatter = buildVitrinaAmbosScatter(proyectos, 'final');

    expect(scatter.included).toBe(2);
    expect(scatter.omitted).toBe(0);
    expect(scatter.points.filter((p) => p.kind === 'destino')).toEqual([
      expect.objectContaining({ nombre: 'A', trl: 6, igip: 4.5 }),
    ]);
    expect(
      scatter.points.filter((p) => p.nombre === 'B').map((p) => p.kind),
    ).toEqual(['inicial']);
  });

  it('omite un estadio si falta TRL o IGIP de ese estadio', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 1.5,
      },
    ]);

    const scatter = buildVitrinaAmbosScatter(proyectos, 'proyeccion');

    expect(scatter.points).toHaveLength(1);
    expect(scatter.points[0]).toMatchObject({ kind: 'inicial', trl: 2, igip: 1.5 });
  });

  it('solo emite puntos iniciales cuando el destino es inicial', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        trlInicial: 2,
        trlProyeccion: 4,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      { nombre: 'B', trlInicial: 3, igipInicial: 2 },
    ]);

    const scatter = buildVitrinaAmbosScatter(proyectos, 'inicial');

    expect(scatter.included).toBe(2);
    expect(scatter.points).toHaveLength(2);
    expect(scatter.points.every((p) => p.kind === 'inicial')).toBe(true);
    expect(scatter.points.map((p) => p.nombre)).toEqual(['A', 'B']);
  });

  it('usa opacidad plena en inicial, 35% en destino Impulsa y 25% en el resto', () => {
    expect(vitrinaAmbosFillOpacity('inicial', 'Fondo Impulsa')).toBe(1);
    expect(vitrinaAmbosFillOpacity('destino', 'Fondo Impulsa')).toBe(0.35);
    expect(vitrinaAmbosFillOpacity('destino', 'Innovación Docente')).toBe(0.25);
    expect(vitrinaAmbosFillOpacity('destino', '')).toBe(0.25);
  });
});

describe('layoutVitrinaAmbosScatter', () => {
  it('coloca TRL en X e IGIP en Y (Y crece hacia arriba)', () => {
    const layout = layoutVitrinaAmbosScatter(
      {
        included: 1,
        omitted: 0,
        points: [
          {
            id: 'a-inicial',
            proyectoId: 'a',
            nombre: 'A',
            kind: 'inicial',
            fondo: '',
            trl: 2,
            igip: 1,
          },
          {
            id: 'a-destino',
            proyectoId: 'a',
            nombre: 'A',
            kind: 'destino',
            fondo: '',
            trl: 8,
            igip: 4,
          },
        ],
      },
      { width: 800, height: 400 },
    );

    const inicial = layout.points.find((p) => p.kind === 'inicial')!;
    const destino = layout.points.find((p) => p.kind === 'destino')!;

    expect(inicial.x).toBeLessThan(destino.x);
    expect(inicial.y).toBeGreaterThan(destino.y);
    expect(layout.xTicks[0]).toBeLessThanOrEqual(2);
    expect(layout.xTicks.at(-1)).toBeGreaterThanOrEqual(8);
    expect(layout.yTicks).toContain(1);
    expect(layout.yTicks).toContain(4);
  });

  it('separa círculos que caen en las mismas coordenadas', () => {
    const layout = layoutVitrinaAmbosScatter(
      {
        included: 2,
        omitted: 0,
        points: [
          {
            id: 'a-inicial',
            proyectoId: 'a',
            nombre: 'Patagon',
            kind: 'inicial',
            fondo: '',
            trl: 2,
            igip: 2,
          },
          {
            id: 'b-inicial',
            proyectoId: 'b',
            nombre: 'CESFAM',
            kind: 'inicial',
            fondo: '',
            trl: 2,
            igip: 2,
          },
        ],
      },
      { width: 800, height: 400 },
    );

    expect(
      layout.points[0].x !== layout.points[1].x ||
        layout.points[0].y !== layout.points[1].y,
    ).toBe(true);
    const dist = Math.hypot(
      layout.points[0].x - layout.points[1].x,
      layout.points[0].y - layout.points[1].y,
    );
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(10);
  });

  it('separa círculos de inicial y destino en las mismas coordenadas', () => {
    const layout = layoutVitrinaAmbosScatter(
      {
        included: 2,
        omitted: 0,
        points: [
          {
            id: 'a-inicial',
            proyectoId: 'a',
            nombre: 'Patagon',
            kind: 'inicial',
            fondo: '',
            trl: 4,
            igip: 3,
          },
          {
            id: 'a-destino',
            proyectoId: 'a',
            nombre: 'Patagon',
            kind: 'destino',
            fondo: '',
            trl: 4,
            igip: 3,
          },
          {
            id: 'b-destino',
            proyectoId: 'b',
            nombre: 'CESFAM',
            kind: 'destino',
            fondo: '',
            trl: 4,
            igip: 3,
          },
        ],
      },
      { width: 800, height: 400 },
    );

    const unique = new Set(
      layout.points.map((point) => `${point.x}:${point.y}`),
    );
    expect(unique.size).toBe(3);

    const inicial = layout.points.find((point) => point.kind === 'inicial')!;
    const destinos = layout.points.filter((point) => point.kind === 'destino');
    for (const destino of destinos) {
      const dist = Math.hypot(inicial.x - destino.x, inicial.y - destino.y);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(10);
    }
  });
});

describe('layoutVitrinaAmbosLabels', () => {
  it('trunca nombres a 30 caracteres', () => {
    const long =
      'Nombre de proyecto muy largo que supera treinta caracteres fácilmente';
    const labels = layoutVitrinaAmbosLabels([
      { id: 'a', nombre: long, x: 200, y: 100 },
    ]);
    expect(labels[0].label.length).toBe(30);
    expect(labels[0].label.endsWith('…')).toBe(true);
  });

  it('mantiene un nombre por proyecto aunque compartan el mismo punto', () => {
    const labels = layoutVitrinaAmbosLabels([
      { id: 'a', nombre: 'ClinicApp', x: 100, y: 100 },
      { id: 'b', nombre: 'AgroTech', x: 100, y: 100 },
      { id: 'c', nombre: 'Beehappy', x: 100.4, y: 99.6 },
    ]);

    expect(labels.map((l) => l.nombre).sort()).toEqual([
      'AgroTech',
      'Beehappy',
      'ClinicApp',
    ]);
    const ys = labels.map((l) => l.y).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(10);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        const a = labels[i];
        const b = labels[j];
        const overlapX =
          a.x - a.width - 2 < b.x + 2 && a.x + 2 > b.x - b.width - 2;
        const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2 + 2;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});
