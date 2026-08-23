import { describe, expect, it } from 'vitest';
import { buildVitrinaDataStats } from '@/lib/vitrina-data-stats';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

function projectsFrom(
  rows: Array<{
    nombre: string;
    fondos?: string[];
    lineas?: string[];
    sedes?: string[];
    escuelas?: string[];
    etiquetas?: string[];
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('buildVitrinaDataStats', () => {
  it('usa la cantidad de proyectos como total', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Impulsa'], lineas: ['L1'] },
      { nombre: 'B', fondos: ['Incuba'], lineas: ['L2'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).total).toBe(2);
  });

  it('cuenta cada fondo y omite Fondo Pruebas y nombres vacíos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Impulsa', 'Fondo Pruebas', ''] },
      { nombre: 'B', fondos: ['Impulsa'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porFondo).toEqual([
      { label: 'Impulsa', value: 2 },
    ]);
  });

  it('suma un proyecto con varios fondos en cada barra', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Impulsa', 'Incuba'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porFondo).toEqual([
      { label: 'Impulsa', value: 1 },
      { label: 'Incuba', value: 1 },
    ]);
  });

  it('cuenta líneas, ordena por valor desc y luego nombre es', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', lineas: ['Zeta', 'Alfa'] },
      { nombre: 'B', lineas: ['Alfa'] },
      { nombre: 'C', lineas: ['Beta'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porLinea).toEqual([
      { label: 'Alfa', value: 2 },
      { label: 'Beta', value: 1 },
      { label: 'Zeta', value: 1 },
    ]);
  });

  it('cuenta sedes, escuelas y etiquetas con el mismo criterio', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        sedes: ['Osorno', 'Valparaíso'],
        escuelas: ['Salud'],
        etiquetas: ['Campamentos', 'Tecnología'],
      },
      {
        nombre: 'B',
        sedes: ['Valparaíso'],
        escuelas: ['Salud', 'Negocios'],
        etiquetas: ['Tecnología'],
      },
    ]);
    const stats = buildVitrinaDataStats(proyectos);
    expect(stats.porSede).toEqual([
      { label: 'Valparaíso', value: 2 },
      { label: 'Osorno', value: 1 },
    ]);
    expect(stats.porEscuela).toEqual([
      { label: 'Salud', value: 2 },
      { label: 'Negocios', value: 1 },
    ]);
    expect(stats.porEtiqueta).toEqual([
      { label: 'Tecnología', value: 2 },
      { label: 'Campamentos', value: 1 },
    ]);
  });

  it('devuelve total 0 y series vacías si no hay proyectos', () => {
    expect(buildVitrinaDataStats([])).toEqual({
      total: 0,
      porFondo: [],
      porLinea: [],
      porSede: [],
      porEscuela: [],
      porEtiqueta: [],
    });
  });
});
