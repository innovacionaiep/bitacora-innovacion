import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  applyVitrinaAiMatchIds,
  filterVitrinaProyectos,
  toggleVitrinaFilterValue,
  uniqueVitrinaFilterOptions,
  vitrinaDiscoveryIsActive,
  vitrinaFiltersAreActive,
  vitrinaAiFilterIsActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';

function projectsFrom(
  rows: Array<{
    nombre: string;
    descripcion?: string;
    fondos?: string[];
    sedes?: string[];
    escuelas?: string[];
    etiquetas?: string[];
    lineas?: string[];
    socios?: string[];
    encargadoNombre?: string;
    encargadoCargo?: string;
    encargadoCorreo?: string;
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

const emptyFilters: VitrinaProjectFilters = {
  fondos: [],
  sedes: [],
  escuelas: [],
  etiquetas: [],
};

describe('uniqueVitrinaFilterOptions', () => {
  it('usa el catálogo completo y conserva su orden', () => {
    const catalogs: VitrinaProjectFilters = {
      fondos: ['Fondo Impulsa', 'Innovación Docente'],
      sedes: ['Valparaíso', 'Antofagasta', 'Concepción'],
      escuelas: ['Salud', 'Artes e Industrias Creativas'],
      etiquetas: ['Campamentos', 'Tecnología', 'Sostenibilidad'],
    };
    expect(uniqueVitrinaFilterOptions(catalogs, [])).toEqual(catalogs);
  });

  it('agrega al final nombres que solo están en proyectos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', sedes: ['Concepción', 'Osorno'] },
    ]);
    expect(
      uniqueVitrinaFilterOptions(
        { sedes: ['Valparaíso', 'Concepción'], escuelas: [], etiquetas: [], fondos: [] },
        proyectos,
      ).sedes,
    ).toEqual(['Valparaíso', 'Concepción', 'Osorno']);
  });

  it('omite Fondo Pruebas del listado de fondos', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Fondo Pruebas', 'Fondo Impulsa'] },
    ]);
    expect(
      uniqueVitrinaFilterOptions(
        {
          fondos: ['Fondo Impulsa', 'Fondo Pruebas', 'Innovación Docente'],
          sedes: [],
          escuelas: [],
          etiquetas: [],
        },
        proyectos,
      ).fondos,
    ).toEqual(['Fondo Impulsa', 'Innovación Docente']);
  });

  it('omite vacíos', () => {
    expect(
      uniqueVitrinaFilterOptions({
        fondos: [],
        sedes: [],
        escuelas: [],
        etiquetas: [],
      }),
    ).toEqual({
      fondos: [],
      sedes: [],
      escuelas: [],
      etiquetas: [],
    });
  });
});

describe('filterVitrinaProyectos', () => {
  const proyectos = projectsFrom([
    {
      nombre: 'Huerta',
      fondos: ['Fondo Impulsa'],
      sedes: ['Chillán'],
      escuelas: ['Artes e Industrias Creativas'],
      etiquetas: ['Sostenibilidad'],
    },
    {
      nombre: 'Solar',
      fondos: ['Innovación Docente'],
      sedes: ['Antofagasta', 'Concepción'],
      escuelas: ['Ingeniería, Energía y Tecnología'],
      etiquetas: ['Tecnología'],
    },
    {
      nombre: 'Campamento',
      fondos: ['Fondo Impulsa'],
      sedes: ['Concepción'],
      escuelas: ['Artes e Industrias Creativas'],
      etiquetas: ['Campamentos', 'Tecnología'],
    },
  ]);

  it('sin filtros devuelve todos', () => {
    expect(filterVitrinaProyectos(proyectos, emptyFilters).map((p) => p.nombre)).toEqual(
      ['Huerta', 'Solar', 'Campamento'],
    );
  });

  it('filtra por sede (OR dentro del facet)', () => {
    const names = filterVitrinaProyectos(proyectos, {
      ...emptyFilters,
      sedes: ['Concepción'],
    }).map((p) => p.nombre);
    expect(names).toEqual(['Solar', 'Campamento']);
  });

  it('filtra por fondo', () => {
    const names = filterVitrinaProyectos(proyectos, {
      ...emptyFilters,
      fondos: ['Fondo Impulsa'],
    }).map((p) => p.nombre);
    expect(names).toEqual(['Huerta', 'Campamento']);
  });

  it('combina facets con AND', () => {
    const names = filterVitrinaProyectos(proyectos, {
      fondos: [],
      sedes: ['Concepción'],
      escuelas: ['Artes e Industrias Creativas'],
      etiquetas: [],
    }).map((p) => p.nombre);
    expect(names).toEqual(['Campamento']);
  });

  it('devuelve vacío si nada coincide', () => {
    expect(
      filterVitrinaProyectos(proyectos, {
        ...emptyFilters,
        sedes: ['Valdivia'],
      }),
    ).toEqual([]);
  });

  it('filtra por texto libre en nombre, sede, etiqueta, escuela, fondo y descripción', () => {
    const withText = projectsFrom([
      {
        nombre: 'Huerta comunitaria',
        descripcion: 'Cultivo de abejas nativas',
        fondos: ['Fondo Impulsa'],
        sedes: ['Los Ángeles'],
        escuelas: ['Artes e Industrias Creativas'],
        etiquetas: ['Sostenibilidad'],
        lineas: ['Incuba'],
        encargadoNombre: 'Ana Pérez',
        encargadoCargo: 'Coordinadora',
      },
      {
        nombre: 'Solar',
        descripcion: 'Paneles en techos',
        fondos: ['Innovación Docente'],
        sedes: ['Antofagasta'],
        escuelas: ['Ingeniería, Energía y Tecnología'],
        etiquetas: ['Tecnología'],
      },
    ]);

    expect(
      filterVitrinaProyectos(withText, emptyFilters, 'ángeles').map((p) => p.nombre),
    ).toEqual(['Huerta comunitaria']);
    expect(
      filterVitrinaProyectos(withText, emptyFilters, 'abejas').map((p) => p.nombre),
    ).toEqual(['Huerta comunitaria']);
    expect(
      filterVitrinaProyectos(withText, emptyFilters, 'ana').map((p) => p.nombre),
    ).toEqual(['Huerta comunitaria']);
    expect(
      filterVitrinaProyectos(withText, emptyFilters, 'incuba').map((p) => p.nombre),
    ).toEqual(['Huerta comunitaria']);
    expect(
      filterVitrinaProyectos(withText, emptyFilters, 'tecnología energía').map(
        (p) => p.nombre,
      ),
    ).toEqual(['Solar']);
    expect(
      filterVitrinaProyectos(
        [
          ...withText,
          ...projectsFrom([
            {
              nombre: 'Otro',
              encargadoCorreo: 'oculto@aiep.cl',
            },
          ]),
        ],
        emptyFilters,
        'oculto@aiep.cl',
      ),
    ).toEqual([]);
  });

  it('combina texto libre con facets (AND)', () => {
    const names = filterVitrinaProyectos(
      proyectos,
      { ...emptyFilters, fondos: ['Fondo Impulsa'] },
      'concepción',
    ).map((p) => p.nombre);
    expect(names).toEqual(['Campamento']);
  });
});

describe('toggleVitrinaFilterValue', () => {
  it('agrega y quita el valor', () => {
    expect(toggleVitrinaFilterValue([], 'Chillán')).toEqual(['Chillán']);
    expect(toggleVitrinaFilterValue(['Chillán', 'Concepción'], 'Chillán')).toEqual(
      ['Concepción'],
    );
  });
});

describe('vitrinaFiltersAreActive', () => {
  it('es true si hay algún valor elegido', () => {
    expect(vitrinaFiltersAreActive(emptyFilters)).toBe(false);
    expect(
      vitrinaFiltersAreActive({ ...emptyFilters, etiquetas: ['Tecnología'] }),
    ).toBe(true);
  });
});

describe('applyVitrinaAiMatchIds', () => {
  const proyectos = projectsFrom([
    { nombre: 'Huerta' },
    { nombre: 'Solar' },
  ]);

  it('no recorta si matchIds es null', () => {
    expect(applyVitrinaAiMatchIds(proyectos, null)).toEqual(proyectos);
  });

  it('intersecta por id', () => {
    const first = proyectos[0];
    if (!first) throw new Error('missing project');
    expect(
      applyVitrinaAiMatchIds(proyectos, [first.id]).map((p) => p.nombre),
    ).toEqual(['Huerta']);
  });

  it('con lista vacía no muestra nada', () => {
    expect(applyVitrinaAiMatchIds(proyectos, [])).toEqual([]);
  });
});

describe('vitrinaDiscoveryIsActive', () => {
  it('considera el recorte de I.A.', () => {
    expect(vitrinaDiscoveryIsActive(emptyFilters, null)).toBe(false);
    expect(vitrinaDiscoveryIsActive(emptyFilters, [])).toBe(true);
  });

  it('considera el texto libre del sidebar', () => {
    expect(vitrinaDiscoveryIsActive(emptyFilters, null, '  ')).toBe(false);
    expect(vitrinaDiscoveryIsActive(emptyFilters, null, 'abejas')).toBe(true);
  });
});

describe('vitrinaAiFilterIsActive', () => {
  it('solo es true cuando el recorte lo aplicó el agente', () => {
    expect(vitrinaAiFilterIsActive(false)).toBe(false);
    expect(vitrinaAiFilterIsActive(true)).toBe(true);
  });
});
