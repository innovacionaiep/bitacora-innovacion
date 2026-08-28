import { describe, expect, it } from 'vitest';
import {
  PORTAL_AVANCES_DEFAULT_FONDO,
  PORTAL_AVANCES_FONDOS,
  canLoadPortalAvances,
  filterPortalAvancesRows,
  portalAvancesCanLoadAppFondos,
  portalAvancesDefaultFondoForLevel,
  portalAvancesFondosForLevel,
  formatPortalAvancesEscuelas,
  portalAvancesAppFondoNames,
  portalAvancesIsAppFondo,
  portalAvancesIsExcelFondo,
  rowsForPortalAvancesFondo,
  uniquePortalAvancesFilterOptions,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';

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

describe('PORTAL_AVANCES_FONDOS', () => {
  it('lista los 7 fondos en el orden pedido', () => {
    expect(PORTAL_AVANCES_FONDOS.map((f) => f.nombre)).toEqual([
      'Innovación Docente',
      'Reto Innovador de Especialidad',
      'Fondo Impulsa',
      'MOVE Incuba',
      'MoveLab',
      'Proyectos Nacionales',
      'Vinculación con el Medio',
      'Fondos Externos',
    ]);
    expect(PORTAL_AVANCES_DEFAULT_FONDO).toBe('Innovación Docente');
  });

  it('solo ID y RIE son fuente app', () => {
    expect(portalAvancesAppFondoNames()).toEqual([
      'Innovación Docente',
      'Reto Innovador de Especialidad',
    ]);
    expect(portalAvancesIsAppFondo('Fondo Impulsa')).toBe(false);
    expect(portalAvancesIsExcelFondo('Fondo Impulsa')).toBe(true);
    expect(portalAvancesIsAppFondo('Innovación Docente')).toBe(true);
  });
});

describe('rowsForPortalAvancesFondo', () => {
  const proyectos = [
    row({
      id: '1',
      fondo: 'Innovación Docente',
      proyecto: 'Aula',
    }),
    row({
      id: '2',
      fondo: 'MOVE Incuba',
      proyecto: 'No debe verse',
    }),
    row({
      id: '3',
      fondo: 'Reto Innovador de Especialidad',
      proyecto: 'Reto',
    }),
  ];

  it('devuelve filas internas del fondo app', () => {
    expect(
      rowsForPortalAvancesFondo(proyectos, 'Innovación Docente').map(
        (p) => p.id,
      ),
    ).toEqual(['1']);
  });

  it('devuelve vacío para fondos external aunque haya filas con ese nombre', () => {
    expect(rowsForPortalAvancesFondo(proyectos, 'MOVE Incuba')).toEqual([]);
  });

  it('devuelve filas excel de Fondo Impulsa', () => {
    const mix = [
      ...proyectos,
      row({
        id: 'impulsa:2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
      }),
    ];
    expect(
      rowsForPortalAvancesFondo(mix, 'Fondo Impulsa').map((p) => p.id),
    ).toEqual(['impulsa:2']);
  });
});

describe('formatPortalAvancesEscuelas', () => {
  it('ordena y une nombres; vacío es string vacío', () => {
    expect(formatPortalAvancesEscuelas(['Negocios', 'Salud'])).toBe(
      'Negocios, Salud',
    );
    expect(formatPortalAvancesEscuelas([])).toBe('');
  });
});

describe('filterPortalAvancesRows', () => {
  const proyectos = [
    row({
      id: 'a',
      proyecto: 'Festival del Futuro',
      sede: 'Rancagua',
      escuelas: ['Salud', 'Negocios'],
    }),
    row({
      id: 'b',
      proyecto: 'Huerto',
      sede: 'Calama',
      escuelas: ['Minería'],
    }),
  ];

  it('busca por nombre, sede y escuela sin acentos', () => {
    expect(
      filterPortalAvancesRows(proyectos, { sedes: [], escuelas: [] }, 'futuro').map(
        (p) => p.id,
      ),
    ).toEqual(['a']);
    expect(
      filterPortalAvancesRows(proyectos, { sedes: [], escuelas: [] }, 'rancagua').map(
        (p) => p.id,
      ),
    ).toEqual(['a']);
    expect(
      filterPortalAvancesRows(proyectos, { sedes: [], escuelas: [] }, 'mineria').map(
        (p) => p.id,
      ),
    ).toEqual(['b']);
  });

  it('filtra sede y escuela con OR interno y AND entre facetas', () => {
    expect(
      filterPortalAvancesRows(proyectos, {
        sedes: ['Rancagua', 'Calama'],
        escuelas: [],
      }).map((p) => p.id),
    ).toEqual(['a', 'b']);
    expect(
      filterPortalAvancesRows(proyectos, {
        sedes: ['Rancagua'],
        escuelas: ['Minería'],
      }),
    ).toEqual([]);
    expect(
      filterPortalAvancesRows(proyectos, {
        sedes: [],
        escuelas: ['Salud'],
      }).map((p) => p.id),
    ).toEqual(['a']);
  });
});

describe('uniquePortalAvancesFilterOptions', () => {
  it('no incluye fondos ni etiquetas', () => {
    const options = uniquePortalAvancesFilterOptions([
      row({ id: '1', sede: 'Calama', escuelas: ['Salud'] }),
    ]);
    expect(options.fondos).toEqual([]);
    expect(options.etiquetas).toEqual([]);
    expect(options.sedes).toEqual(['Calama']);
    expect(options.escuelas).toEqual(['Salud']);
  });
});

describe('canLoadPortalAvances', () => {
  it('nivel 0 Causalab invitado, 2 y 3 sí; sesión 0, 1 y sin acceso no', () => {
    expect(canLoadPortalAvances(null)).toBe(false);
    expect(canLoadPortalAvances(0)).toBe(true);
    expect(canLoadPortalAvances(0, 'guest')).toBe(true);
    expect(canLoadPortalAvances(0, 'session')).toBe(false);
    expect(canLoadPortalAvances(1)).toBe(false);
    expect(canLoadPortalAvances(2)).toBe(true);
    expect(canLoadPortalAvances(3)).toBe(true);
  });
});

describe('portalAvancesFondosForLevel', () => {
  it('nivel 0 Causalab solo Fondo Impulsa', () => {
    expect(portalAvancesFondosForLevel(0).map((f) => f.nombre)).toEqual([
      'Fondo Impulsa',
    ]);
    expect(portalAvancesDefaultFondoForLevel(0)).toBe('Fondo Impulsa');
    expect(portalAvancesCanLoadAppFondos(0)).toBe(false);
  });

  it('niveles 2 y 3 ven toda la botonera', () => {
    expect(portalAvancesFondosForLevel(2)).toEqual(PORTAL_AVANCES_FONDOS);
    expect(portalAvancesCanLoadAppFondos(2)).toBe(true);
    expect(portalAvancesDefaultFondoForLevel(2)).toBe(
      PORTAL_AVANCES_DEFAULT_FONDO,
    );
  });
});
