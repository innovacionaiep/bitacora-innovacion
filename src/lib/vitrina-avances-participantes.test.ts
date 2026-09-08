import { describe, expect, it } from 'vitest';
import {
  PORTAL_AVANCES_FONDOS,
  portalAvancesFondosForLevel,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';
import {
  portalAvancesFondoHasParticipanteCounts,
  sumVitrinaAvancesParticipantes,
} from '@/lib/vitrina-avances-participantes';

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

describe('sumVitrinaAvancesParticipantes', () => {
  it('marca los fondos de Avances con columnas de personas', () => {
    expect(portalAvancesFondoHasParticipanteCounts('Innovación Docente')).toBe(
      true,
    );
    expect(portalAvancesFondoHasParticipanteCounts('Fondo Impulsa')).toBe(true);
    expect(
      portalAvancesFondoHasParticipanteCounts('Vinculación con el Medio'),
    ).toBe(true);
  });

  it('suma estudiantes, docentes y beneficiarios de fondos habilitados con esas columnas', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        estudiantes: 3,
        docentes: 1,
        beneficiarios: 4,
      }),
      row({
        id: '2',
        fondo: 'Fondo Impulsa',
        estudiantes: 10,
        docentes: 2,
        beneficiarios: 5,
      }),
      row({
        id: '3',
        fondo: 'Vinculación con el Medio',
        estudiantes: 1,
        docentes: 1,
        beneficiarios: 0,
      }),
    ];
    expect(
      sumVitrinaAvancesParticipantes(proyectos, PORTAL_AVANCES_FONDOS),
    ).toEqual({
      estudiantes: 14,
      docentes: 4,
      beneficiarios: 9,
    });
  });

  it('omite fondos external aunque traigan conteos', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        estudiantes: 2,
        docentes: 1,
        beneficiarios: 0,
      }),
      row({
        id: '2',
        fondo: 'MOVE Incuba',
        estudiantes: 99,
        docentes: 99,
        beneficiarios: 99,
      }),
    ];
    expect(
      sumVitrinaAvancesParticipantes(proyectos, PORTAL_AVANCES_FONDOS),
    ).toEqual({
      estudiantes: 2,
      docentes: 1,
      beneficiarios: 0,
    });
  });

  it('omite fondos que no están habilitados para el nivel', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        estudiantes: 5,
        docentes: 2,
        beneficiarios: 1,
      }),
      row({
        id: 'impulsa',
        fondo: 'Fondo Impulsa',
        estudiantes: 7,
        docentes: 3,
        beneficiarios: 2,
      }),
    ];
    expect(
      sumVitrinaAvancesParticipantes(
        proyectos,
        portalAvancesFondosForLevel(0),
      ),
    ).toEqual({
      estudiantes: 7,
      docentes: 3,
      beneficiarios: 2,
    });
  });

  it('trata celdas vacías como 0', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Fondo Impulsa',
        estudiantes: null,
        docentes: 2,
        beneficiarios: undefined,
      }),
    ];
    expect(
      sumVitrinaAvancesParticipantes(proyectos, PORTAL_AVANCES_FONDOS),
    ).toEqual({
      estudiantes: 0,
      docentes: 2,
      beneficiarios: 0,
    });
  });

  it('restringe la suma a los fondos del filtro de Análisis (botonera Avances)', () => {
    const proyectos = [
      row({
        id: '1',
        fondo: 'Innovación Docente',
        estudiantes: 3,
        docentes: 1,
        beneficiarios: 4,
      }),
      row({
        id: '2',
        fondo: 'Fondo Impulsa',
        estudiantes: 10,
        docentes: 2,
        beneficiarios: 5,
      }),
    ];
    expect(
      sumVitrinaAvancesParticipantes(proyectos, PORTAL_AVANCES_FONDOS, [
        'Fondo Impulsa',
      ]),
    ).toEqual({
      estudiantes: 10,
      docentes: 2,
      beneficiarios: 5,
    });
  });
});
