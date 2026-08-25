import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaIgipScatter,
  igipAxisDomain,
  layoutVitrinaIgipScatter,
} from '@/lib/vitrina-igip-scatter';

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

describe('buildVitrinaIgipScatter', () => {
  it('crea una fila por proyecto y omite incompletos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', igipInicial: 1.2, igipProyeccion: 3.5 },
      { nombre: 'B', igipInicial: 1.2, igipProyeccion: 3.5 },
      { nombre: 'C', igipInicial: 4, igipProyeccion: 6.25 },
      { nombre: 'D', igipInicial: 2 },
      { nombre: 'E', igipProyeccion: 8 },
    ]);

    const scatter = buildVitrinaIgipScatter(proyectos, 'proyeccion');

    expect(scatter.included).toBe(3);
    expect(scatter.omitted).toBe(2);
    expect(scatter.pairs).toEqual([
      expect.objectContaining({ from: 1.2, to: 3.5, nombre: 'A' }),
      expect.objectContaining({ from: 1.2, to: 3.5, nombre: 'B' }),
      expect.objectContaining({ from: 4, to: 6.25, nombre: 'C' }),
    ]);
    expect(new Set(scatter.pairs.map((pair) => pair.id)).size).toBe(3);
  });

  it('usa IGIP Final cuando el destino es final', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', igipInicial: 1.25, igipProyeccion: 3, igipFinal: 7.5 },
      { nombre: 'B', igipInicial: 1.25, igipProyeccion: 4 },
    ]);

    const scatter = buildVitrinaIgipScatter(proyectos, 'final');

    expect(scatter.included).toBe(1);
    expect(scatter.omitted).toBe(1);
    expect(scatter.pairs).toEqual([
      expect.objectContaining({ from: 1.25, to: 7.5, nombre: 'A' }),
    ]);
  });

  it('ordena por nombre, inicial, destino o variación', () => {
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', igipInicial: 2, igipProyeccion: 2.2 },
      { nombre: 'AgroTech', igipInicial: 4, igipProyeccion: 4.5 },
      { nombre: 'Beehappy', igipInicial: 1, igipProyeccion: 3 },
    ]);

    expect(
      buildVitrinaIgipScatter(proyectos, 'proyeccion', 'nombre').pairs.map(
        (p) => p.nombre,
      ),
    ).toEqual(['AgroTech', 'Beehappy', 'ClinicApp']);

    expect(
      buildVitrinaIgipScatter(proyectos, 'proyeccion', 'inicial').pairs.map(
        (p) => p.nombre,
      ),
    ).toEqual(['AgroTech', 'ClinicApp', 'Beehappy']);

    expect(
      buildVitrinaIgipScatter(proyectos, 'proyeccion', 'destino').pairs.map(
        (p) => p.nombre,
      ),
    ).toEqual(['AgroTech', 'Beehappy', 'ClinicApp']);

    expect(
      buildVitrinaIgipScatter(proyectos, 'proyeccion', 'variacion').pairs.map(
        (p) => p.nombre,
      ),
    ).toEqual(['Beehappy', 'AgroTech', 'ClinicApp']);
  });
});

describe('layoutVitrinaIgipScatter', () => {
  it('dibuja una fila por proyecto, con inicial y destino en el eje horizontal', () => {
    const layout = layoutVitrinaIgipScatter(
      {
        included: 2,
        omitted: 0,
        pairs: [
          { id: 'a', nombre: 'A', from: 1, to: 4 },
          { id: 'b', nombre: 'B', from: 2, to: 2 },
        ],
      },
      { width: 800 },
    );

    const a = layout.points[0];
    const b = layout.points[1];
    expect(a.xFrom).toBeLessThan(a.xTo);
    expect(b.xFrom).toBe(b.xTo);
    expect(a.y).toBeLessThan(b.y);
  });
});

describe('igipAxisDomain', () => {
  it('genera ticks fijos de 0.25 que cubren el rango', () => {
    expect(igipAxisDomain(1.65, 3.1)).toEqual({
      min: 1.5,
      max: 3.25,
      ticks: [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25],
    });
  });
});
