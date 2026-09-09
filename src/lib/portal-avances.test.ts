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
  formatPortalAvancesCommaList,
  formatPortalAvancesSede,
  portalAvancesAppFondoNames,
  portalAvancesIsAppFondo,
  portalAvancesIsExcelFondo,
  portalAvancesLevelCanSeeFondo,
  rowsForPortalAvancesFondo,
  cascadingPortalAvancesFilterOptions,
  uniquePortalAvancesFilterOptions,
  countPortalAvancesParticipantes,
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
    expect(portalAvancesIsExcelFondo('Vinculación con el Medio')).toBe(true);
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

  it('devuelve filas excel de Vinculación con el Medio', () => {
    const mix = [
      ...proyectos,
      row({
        id: 'vcm:4',
        fondo: 'Vinculación con el Medio',
        proyecto: 'Iniciativa VcM',
      }),
    ];
    expect(
      rowsForPortalAvancesFondo(mix, 'Vinculación con el Medio').map(
        (p) => p.id,
      ),
    ).toEqual(['vcm:4']);
  });
});

describe('formatPortalAvancesEscuelas', () => {
  it('ordena y une nombres con salto de línea; vacío es string vacío', () => {
    expect(formatPortalAvancesEscuelas(['Negocios', 'Salud'])).toBe(
      'Negocios\nSalud',
    );
    expect(formatPortalAvancesEscuelas([])).toBe('');
    expect(
      formatPortalAvancesEscuelas(['Ingeniería, Energía y Tecnología']),
    ).toBe('Ingeniería, Energía y Tecnología');
  });
});

describe('formatPortalAvancesCommaList', () => {
  it('parte solo por | y conserva comas en el nombre', () => {
    expect(
      formatPortalAvancesCommaList([
        'Ingeniería en Automatización y Control Industrial | Técnico en Electricidad y Electrónica',
      ]),
    ).toBe(
      'Ingeniería en Automatización y Control Industrial\nTécnico en Electricidad y Electrónica',
    );
    expect(
      formatPortalAvancesCommaList([
        'Técnico en Administración de Empresas, Mención Recursos Humanos',
      ]),
    ).toBe(
      'Técnico en Administración de Empresas, Mención Recursos Humanos',
    );
    expect(
      formatPortalAvancesCommaList([
        'TTS601 - Taller Intervención Grupo/Comunidad',
      ]),
    ).toBe('TTS601 - Taller Intervención Grupo/Comunidad');
  });
});

describe('formatPortalAvancesSede', () => {
  it('parte sedes múltiples a líneas', () => {
    expect(formatPortalAvancesSede('Antofagasta, Bellavista')).toBe(
      'Antofagasta\nBellavista',
    );
    expect(formatPortalAvancesSede('Castro')).toBe('Castro');
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
    row({
      id: 'c',
      proyecto: 'Otro',
      sede: 'Valparaíso',
      escuelas: ['Negocios'],
      carreras: ['Enfermería'],
      asignaturas: ['Anatomía'],
      encargado: 'jeremy.torres@aiep.cl',
    }),
  ];

  it('busca por nombre, sede y escuela sin acentos', () => {
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'futuro',
      ).map(
        (p) => p.id,
      ),
    ).toEqual(['a']);
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'rancagua',
      ).map(
        (p) => p.id,
      ),
    ).toEqual(['a']);
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'mineria',
      ).map(
        (p) => p.id,
      ),
    ).toEqual(['b']);
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'enfermeria',
      ).map(
        (p) => p.id,
      ),
    ).toEqual(['c']);
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'anatomia',
      ).map(
        (p) => p.id,
      ),
    ).toEqual(['c']);
    expect(
      filterPortalAvancesRows(
        proyectos,
        { nombres: [], sedes: [], escuelas: [] },
        'jeremy.torres',
      ).map((p) => p.id),
    ).toEqual(['c']);
  });

  it('filtra sede y escuela con OR interno y AND entre facetas', () => {
    expect(
      filterPortalAvancesRows(proyectos, {
        nombres: [],
        sedes: ['Rancagua', 'Calama'],
        escuelas: [],
      }).map((p) => p.id),
    ).toEqual(['a', 'b']);
    expect(
      filterPortalAvancesRows(proyectos, {
        nombres: [],
        sedes: ['Rancagua'],
        escuelas: ['Minería'],
      }),
    ).toEqual([]);
    expect(
      filterPortalAvancesRows(proyectos, {
        nombres: [],
        sedes: [],
        escuelas: ['Salud'],
      }).map((p) => p.id),
    ).toEqual(['a']);
  });

  it('filtra por nombre de proyecto', () => {
    expect(
      filterPortalAvancesRows(proyectos, {
        nombres: ['Huerto', 'Festival del Futuro'],
        sedes: [],
        escuelas: [],
      }).map((p) => p.id),
    ).toEqual(['a', 'b']);
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
    expect(options.nombres).toEqual(['Proyecto']);
  });
});

describe('cascadingPortalAvancesFilterOptions', () => {
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
    row({
      id: 'c',
      proyecto: 'Otro',
      sede: 'Valparaíso',
      escuelas: ['Negocios'],
    }),
  ];

  it('un filtro recorta proyectos y escuelas, y deja las sedes compatibles', () => {
    const options = cascadingPortalAvancesFilterOptions(proyectos, {
      nombres: [],
      sedes: ['Rancagua'],
      escuelas: [],
    });
    expect(options.nombres).toEqual(['Festival del Futuro']);
    expect(options.escuelas).toEqual(['Negocios', 'Salud']);
    expect(options.sedes).toEqual(['Calama', 'Rancagua', 'Valparaíso']);
  });

  it('el segundo filtro recorta otra vez', () => {
    const options = cascadingPortalAvancesFilterOptions(proyectos, {
      nombres: [],
      sedes: ['Rancagua'],
      escuelas: ['Negocios'],
    });
    expect(options.nombres).toEqual(['Festival del Futuro']);
    expect(options.escuelas).toEqual(['Negocios', 'Salud']);
    expect(options.sedes).toEqual(['Rancagua', 'Valparaíso']);
  });
});

describe('canLoadPortalAvances', () => {
  it('nivel 0 general, Causalab invitado, 2 y 3 sí; sesión 0, 1 y sin acceso no', () => {
    expect(canLoadPortalAvances(null)).toBe(false);
    expect(canLoadPortalAvances(0)).toBe(true);
    expect(canLoadPortalAvances(0, 'guest')).toBe(true);
    expect(canLoadPortalAvances(0, 'session')).toBe(false);
    expect(canLoadPortalAvances(1)).toBe(false);
    expect(canLoadPortalAvances(2)).toBe(true);
    expect(canLoadPortalAvances(3)).toBe(true);
    expect(canLoadPortalAvances(1, 'guest', 'visor')).toBe(false);
    expect(canLoadPortalAvances(2, 'guest', 'visor')).toBe(false);
  });
});

describe('countPortalAvancesParticipantes', () => {
  it('suma rol canónico y cargo, sin contar Beneficiario en otras columnas', () => {
    const counts = countPortalAvancesParticipantes([
      { proyectoId: 'p1', rol: 'Estudiante', cargo: null },
      { proyectoId: 'p1', rol: 'Colaborador', cargo: 'Ayudante estudiante' },
      { proyectoId: 'p1', rol: 'Encargado', cargo: 'Estudiante tesista' },
      { proyectoId: 'p1', rol: 'Beneficiario', cargo: 'Estudiante' },
      { proyectoId: 'p1', rol: 'Docente', cargo: null },
      { proyectoId: 'p1', rol: 'Coordinador', cargo: 'Docente guía' },
      { proyectoId: 'p1', rol: 'Beneficiario', cargo: 'Docente' },
      { proyectoId: 'p1', rol: 'Beneficiario', cargo: null },
      { proyectoId: 'p1', rol: 'Estudiante', cargo: 'Docente en práctica' },
    ]);

    expect(counts.get('p1')).toEqual({
      estudiantes: 4,
      docentes: 3,
      beneficiarios: 3,
    });
  });

  it('agrupa por proyecto y no duplica el mismo rol+cargo', () => {
    const counts = countPortalAvancesParticipantes([
      { proyectoId: 'a', rol: 'Estudiante', cargo: 'Estudiante' },
      { proyectoId: 'b', rol: 'Docente', cargo: 'docente' },
    ]);
    expect(counts.get('a')).toEqual({
      estudiantes: 1,
      docentes: 0,
      beneficiarios: 0,
    });
    expect(counts.get('b')).toEqual({
      estudiantes: 0,
      docentes: 1,
      beneficiarios: 0,
    });
  });
});

describe('portalAvancesFondosForLevel', () => {
  it('perfil Causalab solo Fondo Impulsa', () => {
    expect(
      portalAvancesFondosForLevel(0, 'causalab').map((f) => f.nombre),
    ).toEqual(['Fondo Impulsa']);
    expect(portalAvancesDefaultFondoForLevel(0, 'causalab')).toBe(
      'Fondo Impulsa',
    );
    expect(portalAvancesCanLoadAppFondos(0, 'guest', 'causalab')).toBe(false);
    expect(
      portalAvancesLevelCanSeeFondo(0, 'Fondo Impulsa', 'causalab'),
    ).toBe(true);
    expect(
      portalAvancesLevelCanSeeFondo(
        0,
        'Vinculación con el Medio',
        'causalab',
      ),
    ).toBe(false);
  });

  it('nivel 0 general ve toda la botonera', () => {
    expect(portalAvancesFondosForLevel(0)).toEqual(PORTAL_AVANCES_FONDOS);
    expect(portalAvancesCanLoadAppFondos(0)).toBe(true);
  });

  it('niveles 2 y 3 ven toda la botonera', () => {
    expect(portalAvancesFondosForLevel(2)).toEqual(PORTAL_AVANCES_FONDOS);
    expect(portalAvancesCanLoadAppFondos(2)).toBe(true);
    expect(portalAvancesDefaultFondoForLevel(2)).toBe(
      PORTAL_AVANCES_DEFAULT_FONDO,
    );
  });
});
