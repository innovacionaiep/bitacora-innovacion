import { describe, expect, it } from 'vitest';
import { PORTAL_AVANCES_FONDOS, type PortalAvancesProyecto } from '@/lib/portal-avances';
import {
  buildVitrinaAvancesAsignaturaCobertura,
  buildVitrinaAvancesAsignaturaStats,
  buildVitrinaAvancesCarreraStats,
} from '@/lib/vitrina-avances-dimension-stats';

function row(
  patch: Partial<PortalAvancesProyecto> & Pick<PortalAvancesProyecto, 'id'>,
): PortalAvancesProyecto {
  return {
    fondo: 'Innovación Docente',
    proyecto: 'Proyecto',
    sede: 'San Antonio',
    escuelas: ['Salud'],
    presupuestoAdjudicado: 0,
    avanceGantt: 0,
    avanceIndicadores: 0,
    avancePresupuestoSolicitado: 0,
    avancePresupuestoEjecutado: 0,
    avanceHonorarios: 0,
    avanceOperativoSolicitado: 0,
    avanceOperativoEjecutado: 0,
    saldoPresupuesto: 0,
    ...patch,
  };
}

describe('buildVitrinaAvancesCarreraStats', () => {
  it('une variantes de mayúsculas y tildes y aplica el título canónico', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        carreras: ['TÉCNICO EN COSMETOLOGÍA'],
      }),
      row({
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        carreras: ['Técnico En Cosmetología'],
      }),
    ];
    expect(buildVitrinaAvancesCarreraStats(proyectos, PORTAL_AVANCES_FONDOS)).toEqual([
      {
        label: 'Técnico en Cosmetología',
        value: 2,
        nombres: ['Aula', 'ClinicApp'],
      },
    ]);
  });

  it('omite fondos external y respeta el filtro de Fondo', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        carreras: ['Enfermería'],
      }),
      row({
        id: '2',
        fondo: 'MOVE Incuba',
        proyecto: 'Externo',
        carreras: ['Enfermería'],
      }),
      row({
        id: '3',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        carreras: ['Minería'],
      }),
    ];
    expect(
      buildVitrinaAvancesCarreraStats(proyectos, PORTAL_AVANCES_FONDOS, [
        'Fondo Impulsa',
      ]),
    ).toEqual([
      { label: 'Minería', value: 1, nombres: ['ClinicApp'] },
    ]);
  });
});

describe('buildVitrinaAvancesAsignaturaStats', () => {
  it('cuenta asignaturas de fondos con esa columna', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        asignaturas: ['Anatomía | Matemáticas'],
      }),
      row({
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        asignaturas: ['Anatomía'],
      }),
    ];
    expect(
      buildVitrinaAvancesAsignaturaStats(proyectos, PORTAL_AVANCES_FONDOS),
    ).toEqual([
      { label: 'Anatomía', value: 2, nombres: ['Aula', 'ClinicApp'] },
      { label: 'Matemáticas', value: 1, nombres: ['Aula'] },
    ]);
  });
});

describe('buildVitrinaAvancesAsignaturaCobertura', () => {
  it('calcula el porcentaje de proyectos de Avances con y sin asignatura', () => {
    const proyectos = [
      row({
        id: '1',
        proyecto: 'Aula',
        asignaturas: ['Anatomía'],
      }),
      row({
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        asignaturas: ['Matemáticas | Física'],
      }),
      row({
        id: '3',
        fondo: 'Vinculación con el Medio',
        proyecto: 'Territorio',
        asignaturas: [],
      }),
    ];
    expect(
      buildVitrinaAvancesAsignaturaCobertura(proyectos, PORTAL_AVANCES_FONDOS),
    ).toEqual({
      total: 3,
      conAsignatura: 2,
      sinAsignatura: 1,
      conPct: 66.7,
      sinPct: 33.3,
      nombresCon: ['Aula', 'ClinicApp'],
      nombresSin: ['Territorio'],
    });
  });

  it('trata celdas vacías o solo separadores como sin asignatura', () => {
    const proyectos = [
      row({ id: '1', proyecto: 'A', asignaturas: undefined }),
      row({ id: '2', proyecto: 'B', asignaturas: ['  |  '] }),
      row({ id: '3', proyecto: 'C', asignaturas: [''] }),
    ];
    const cobertura = buildVitrinaAvancesAsignaturaCobertura(
      proyectos,
      PORTAL_AVANCES_FONDOS,
    );
    expect(cobertura).toMatchObject({
      total: 3,
      conAsignatura: 0,
      sinAsignatura: 3,
      conPct: 0,
      sinPct: 100,
    });
  });

  it('omite fondos external y respeta el filtro de Fondo', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        asignaturas: ['Anatomía'],
      }),
      row({
        id: '2',
        fondo: 'MOVE Incuba',
        proyecto: 'Externo',
        asignaturas: ['Geología'],
      }),
      row({
        id: '3',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        asignaturas: [],
      }),
    ];
    expect(
      buildVitrinaAvancesAsignaturaCobertura(proyectos, PORTAL_AVANCES_FONDOS, [
        'Fondo Impulsa',
      ]),
    ).toEqual({
      total: 1,
      conAsignatura: 0,
      sinAsignatura: 1,
      conPct: 0,
      sinPct: 100,
      nombresCon: [],
      nombresSin: ['ClinicApp'],
    });
  });
});
