import { describe, expect, it } from 'vitest';
import {
  buildVitrinaDataStats,
  countVitrinaSociosComunitarios,
} from '@/lib/vitrina-data-stats';
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
      { label: 'Impulsa', value: 2, nombres: ['A', 'B'] },
    ]);
  });

  it('suma un proyecto con varios fondos en cada barra', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Impulsa', 'Incuba'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porFondo).toEqual([
      { label: 'Impulsa', value: 1, nombres: ['A'] },
      { label: 'Incuba', value: 1, nombres: ['A'] },
    ]);
  });

  it('cuenta líneas, ordena por valor desc y luego nombre es', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', lineas: ['Zeta', 'Alfa'] },
      { nombre: 'B', lineas: ['Alfa'] },
      { nombre: 'C', lineas: ['Beta'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porLinea).toEqual([
      { label: 'Alfa', value: 2, nombres: ['A', 'B'] },
      { label: 'Beta', value: 1, nombres: ['C'] },
      { label: 'Zeta', value: 1, nombres: ['A'] },
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
      { label: 'Valparaíso', value: 2, nombres: ['A', 'B'] },
      { label: 'Osorno', value: 1, nombres: ['A'] },
    ]);
    expect(stats.porEscuela).toEqual([
      { label: 'Salud', value: 2, nombres: ['A', 'B'] },
      { label: 'Negocios', value: 1, nombres: ['B'] },
    ]);
    expect(stats.porEtiqueta).toEqual([
      { label: 'Tecnología', value: 2, nombres: ['A', 'B'] },
      { label: 'Campamentos', value: 1, nombres: ['A'] },
    ]);
  });

  it('ordena los nombres de cada barra en español', () => {
    const proyectos = projectsFrom([
      { nombre: 'Zeta App', fondos: ['Impulsa'] },
      { nombre: 'Alfa App', fondos: ['Impulsa'] },
    ]);
    expect(buildVitrinaDataStats(proyectos).porFondo[0].nombres).toEqual([
      'Alfa App',
      'Zeta App',
    ]);
  });

  it('asocia cada línea al fondo padre más frecuente', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
        lineas: ['Innovación'],
      },
      {
        nombre: 'B',
        fondos: ['Innovación Docente'],
        lineas: ['Innovación en el Aula'],
      },
    ]);
    expect(buildVitrinaDataStats(proyectos).porLinea).toEqual([
      {
        label: 'Innovación',
        value: 1,
        nombres: ['A'],
        parentFondo: 'Fondo Impulsa',
      },
      {
        label: 'Innovación en el Aula',
        value: 1,
        nombres: ['B'],
        parentFondo: 'Innovación Docente',
      },
    ]);
  });

  it('prioriza el fondo del catálogo sobre los votos del proyecto', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
        lineas: ['Innovación'],
      },
    ]);
    expect(
      buildVitrinaDataStats(proyectos, {
        fondos: [
          { id: 'f-id', nombre: 'Innovación Docente' },
          { id: 'f-imp', nombre: 'Fondo Impulsa' },
        ],
        lineas: [{ nombre: 'Innovación', fondoId: 'f-id' }],
      }).porLinea[0]?.parentFondo,
    ).toBe('Innovación Docente');
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

describe('countVitrinaSociosComunitarios', () => {
  it('cuenta socios únicos por id entre los proyectos filtrados', () => {
    const proyectos = projectsFrom([
      { nombre: 'A' },
      { nombre: 'B' },
      { nombre: 'C' },
    ]);
    proyectos[0]!.socioIds = ['s1', 's2'];
    proyectos[0]!.socios = ['MUKUNA', 'Otro'];
    proyectos[1]!.socioIds = ['s1'];
    proyectos[1]!.socios = ['MUKUNA'];
    proyectos[2]!.socioIds = [];
    proyectos[2]!.socios = [];
    expect(countVitrinaSociosComunitarios(proyectos)).toBe(2);
  });

  it('si no hay ids, cuenta nombres únicos', () => {
    const proyectos = projectsFrom([{ nombre: 'A' }, { nombre: 'B' }]);
    proyectos[0]!.socios = ['MUKUNA', 'MUKUNA'];
    proyectos[1]!.socios = ['MUKUNA'];
    expect(countVitrinaSociosComunitarios(proyectos)).toBe(1);
  });
});
