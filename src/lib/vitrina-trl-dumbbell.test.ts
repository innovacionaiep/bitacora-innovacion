import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaTrlDumbbell,
  layoutVitrinaTrlDumbbell,
} from '@/lib/vitrina-trl-dumbbell';

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

describe('buildVitrinaTrlDumbbell', () => {
  it('crea una fila por proyecto y omite incompletos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'B', trlInicial: 2, trlProyeccion: 5 },
      { nombre: 'C', trlInicial: 3 },
    ]);

    const dumbbell = buildVitrinaTrlDumbbell(proyectos, 'proyeccion');

    expect(dumbbell.included).toBe(2);
    expect(dumbbell.omitted).toBe(1);
    expect(dumbbell.pairs.map((p) => p.nombre)).toEqual(['B', 'A']);
  });

  it('ordena por nombre A-Z', () => {
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'AgroTech', trlInicial: 3, trlProyeccion: 5 },
    ]);

    expect(
      buildVitrinaTrlDumbbell(proyectos, 'proyeccion', 'nombre').pairs.map(
        (p) => p.nombre,
      ),
    ).toEqual(['AgroTech', 'ClinicApp']);
  });
});

describe('layoutVitrinaTrlDumbbell', () => {
  it('dibuja una fila por proyecto en el eje horizontal', () => {
    const layout = layoutVitrinaTrlDumbbell(
      {
        included: 2,
        omitted: 0,
        pairs: [
          { id: 'a', nombre: 'A', from: 2, to: 5 },
          { id: 'b', nombre: 'B', from: 3, to: 3 },
        ],
      },
      { width: 800 },
    );

    expect(layout.points[0].xFrom).toBeLessThan(layout.points[0].xTo);
    expect(layout.points[1].xFrom).toBe(layout.points[1].xTo);
    expect(layout.ticks).toEqual([2, 3, 4, 5]);
  });
});
