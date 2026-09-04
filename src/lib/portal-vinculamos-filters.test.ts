import { describe, expect, it } from 'vitest';
import type { MideimpactoIniciativa } from '@/lib/mideimpacto-iniciativas';
import {
  EMPTY_VINCULAMOS_FILTERS,
  filterVinculamosRows,
  uniqueVinculamosFilterOptions,
  yearFromDateText,
} from '@/lib/portal-vinculamos-filters';

function row(
  patch: Partial<MideimpactoIniciativa> & Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    estado: 'Activa',
    fechaInicio: '2024-03-01',
    fechaTermino: '2025-01-01',
    mecanismo: 'Extensión',
    adjuntos: [],
    sede: '',
    ...patch,
  };
}

describe('portal-vinculamos-filters', () => {
  it('arma opciones de ID, nombre, estado, año y mecanismo', () => {
    const options = uniqueVinculamosFilterOptions([
      row({ id: '2', nombre: 'Beta', estado: 'Cerrada', mecanismo: 'Prácticas' }),
      row({ id: '1', nombre: 'Alfa', fechaInicio: '2023-01-01', fechaTermino: '' }),
    ]);
    expect(options.ids).toEqual(['1', '2']);
    expect(options.nombres).toEqual(['Alfa', 'Beta']);
    expect(options.estados).toEqual(['Activa', 'Cerrada']);
    expect(options.fechas).toEqual(['2023', '2024', '2025']);
    expect(options.mecanismos).toEqual(['Extensión', 'Prácticas']);
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

  it('saca el año de fechas ISO', () => {
    expect(yearFromDateText('2024-12-31')).toBe('2024');
    expect(yearFromDateText('')).toBe('');
  });
});
