import { describe, expect, it } from 'vitest';
import type { MideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';
import { emptyMideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';
import {
  EMPTY_VINCULAMOS_FILTERS,
  addVinculamosContainsTerm,
  defaultVinculamosVisibleColumns,
  filterVinculamosRows,
  toggleVinculamosColumn,
  uniqueVinculamosFilterOptions,
  yearFromDateText,
} from '@/lib/portal-vinculamos-filters';

function row(
  patch: Partial<MideimpactoIniciativa> & Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    ...emptyMideimpactoIniciativa(),
    estado: 'Activa',
    fechaInicio: '2024-03-01',
    fechaTermino: '2025-01-01',
    mecanismo: 'Extensión',
    ...patch,
  };
}

describe('portal-vinculamos-filters', () => {
  it('arma opciones de ID, nombre, estado, año, mecanismo y facetas anidadas', () => {
    const options = uniqueVinculamosFilterOptions([
      row({
        id: '2',
        nombre: 'Beta',
        estado: 'Cerrada',
        mecanismo: 'Prácticas',
        escuelasCarreras: [
          {
            sedeNombre: 'Casa Central',
            escuNombre: 'Salud',
            painEstudiantes: '',
            painEstudiantesFinal: '',
            painDocentes: '',
            painDocentesFinal: '',
          },
        ],
        territorios: [
          { region: 'Valparaíso', provincia: 'Valparaíso', comuna: 'Viña' },
        ],
        participantesExternos: [
          {
            socioComunitario: 'Junta de Vecinos',
            grupo: '',
            subgrupo: '',
            beneficiarios: '3',
            beneficiariosFinal: '0',
          },
        ],
        gruposInteres: ['Personas mayores'],
        tematicas: ['Medioambiente'],
      }),
      row({ id: '1', nombre: 'Alfa', fechaInicio: '2023-01-01', fechaTermino: '' }),
    ]);
    expect(options.ids).toEqual(['1', '2']);
    expect(options.nombres).toEqual(['Alfa', 'Beta']);
    expect(options.estados).toEqual(['Activa', 'Cerrada']);
    expect(options.fechas).toEqual(['2023', '2024', '2025']);
    expect(options.mecanismos).toEqual(['Extensión', 'Prácticas']);
    expect(options.sedes).toEqual(['Casa Central']);
    expect(options.escuelas).toEqual(['Salud']);
    expect(options.regiones).toEqual(['Valparaíso']);
    expect(options.comunas).toEqual(['Viña']);
    expect(options.socios).toEqual(['Junta de Vecinos']);
    expect(options.gruposInteres).toEqual(['Personas mayores']);
    expect(options.tematicas).toEqual(['Medioambiente']);
  });

  it('filtra por facetas en AND y deja pasar si la faceta está vacía', () => {
    const rows = [
      row({ id: '1', nombre: 'Alfa', estado: 'Activa', mecanismo: 'Extensión' }),
      row({ id: '2', nombre: 'Beta', estado: 'Cerrada', mecanismo: 'Prácticas' }),
    ];
    expect(filterVinculamosRows(rows, EMPTY_VINCULAMOS_FILTERS)).toHaveLength(2);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        estados: ['Activa'],
        mecanismos: ['Extensión'],
      }).map((r) => r.id),
    ).toEqual(['1']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        fechas: ['2025'],
      }).map((r) => r.id),
    ).toEqual(['1', '2']);
  });

  it('filtra nombre y socio por texto contenido, sin importar mayúsculas', () => {
    const rows = [
      row({
        id: '1',
        nombre: 'Huertos urbanos',
        participantesExternos: [
          {
            socioComunitario: 'Junta de Vecinos',
            grupo: '',
            subgrupo: '',
            beneficiarios: '',
            beneficiariosFinal: '',
          },
        ],
      }),
      row({ id: '2', nombre: 'Taller de robótica' }),
    ];
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        nombres: ['huerto'],
      }).map((r) => r.id),
    ).toEqual(['1']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        socios: ['VECINOS'],
      }).map((r) => r.id),
    ).toEqual(['1']);
    expect(
      addVinculamosContainsTerm(EMPTY_VINCULAMOS_FILTERS, 'nombres', '  Huerto  ')
        .nombres,
    ).toEqual(['Huerto']);
  });

  it('saca el año de fechas ISO', () => {
    expect(yearFromDateText('2024-12-31')).toBe('2024');
    expect(yearFromDateText('')).toBe('');
  });

  it('filtra por Sede*, escuela, región, comuna, socio y chips', () => {
    const rows = [
      row({
        id: '1',
        nombre: 'Alfa',
        escuelasCarreras: [
          {
            sedeNombre: 'Aiep Online',
            escuNombre: 'Salud',
            painEstudiantes: '',
            painEstudiantesFinal: '',
            painDocentes: '',
            painDocentesFinal: '',
          },
        ],
        territorios: [
          { region: 'Valparaíso', provincia: '', comuna: 'Viña' },
        ],
        participantesExternos: [
          {
            socioComunitario: 'Junta de Vecinos',
            grupo: '',
            subgrupo: '',
            beneficiarios: '',
            beneficiariosFinal: '',
          },
        ],
        gruposInteres: ['Personas mayores'],
        tematicas: ['Medioambiente'],
      }),
      row({
        id: '2',
        nombre: 'Beta',
        escuelasCarreras: [
          {
            sedeNombre: 'Casa Central',
            escuNombre: 'Educación',
            painEstudiantes: '',
            painEstudiantesFinal: '',
            painDocentes: '',
            painDocentesFinal: '',
          },
        ],
        territorios: [
          { region: 'Metropolitana', provincia: '', comuna: 'Providencia' },
        ],
        participantesExternos: [
          {
            socioComunitario: 'Municipalidad',
            grupo: '',
            subgrupo: '',
            beneficiarios: '',
            beneficiariosFinal: '',
          },
        ],
        gruposInteres: ['Estudiantes'],
        tematicas: ['Sostenibilidad'],
      }),
    ];
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        sedes: ['Aiep Online'],
      }).map((r) => r.id),
    ).toEqual(['1']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        escuelas: ['Educación'],
      }).map((r) => r.id),
    ).toEqual(['2']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        regiones: ['Valparaíso'],
        comunas: ['Viña'],
      }).map((r) => r.id),
    ).toEqual(['1']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        socios: ['Municipalidad'],
      }).map((r) => r.id),
    ).toEqual(['2']);
    expect(
      filterVinculamosRows(rows, {
        ...EMPTY_VINCULAMOS_FILTERS,
        gruposInteres: ['Personas mayores'],
        tematicas: ['Medioambiente'],
      }).map((r) => r.id),
    ).toEqual(['1']);
  });

  it('no deja el listado de columnas vacío al ocultar la última', () => {
    const onlyId = toggleVinculamosColumn(
      defaultVinculamosVisibleColumns(),
      'id',
    );
    expect(onlyId).not.toContain('id');
    expect(toggleVinculamosColumn(['nombre'], 'nombre')).toEqual(['nombre']);
  });
});
