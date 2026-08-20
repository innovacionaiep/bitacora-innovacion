import { describe, expect, it } from 'vitest';
import {
  namesToImportAgainstExisting,
  parseCatalogNamesFromSheetRows,
} from '@/lib/catalog-import-names';

describe('parseCatalogNamesFromSheetRows', () => {
  it('omite encabezado nombre y toma la primera columna', () => {
    expect(
      parseCatalogNamesFromSheetRows([
        ['Nombre'],
        ['  Territorio  '],
        [''],
        ['Innovación'],
      ]),
    ).toEqual(['Territorio', 'Innovación']);
  });

  it('omite encabezado etiqueta/etiquetas', () => {
    expect(parseCatalogNamesFromSheetRows([['etiqueta'], ['Social']])).toEqual([
      'Social',
    ]);
    expect(parseCatalogNamesFromSheetRows([['Etiquetas'], ['Rural']])).toEqual([
      'Rural',
    ]);
  });

  it('si no hay encabezado, usa todas las filas de la primera columna', () => {
    expect(parseCatalogNamesFromSheetRows([['A'], ['B']])).toEqual(['A', 'B']);
  });
});

describe('namesToImportAgainstExisting', () => {
  it('deduplica por minúsculas y omite las que ya existen', () => {
    const result = namesToImportAgainstExisting(
      [' Social ', 'social', 'Territorio', ''],
      ['territorio', 'Otro'],
    );
    expect(result.toCreate).toEqual(['Social']);
    expect(result.skipped).toBe(1);
  });

  it('no crea nada si todas ya existen', () => {
    const result = namesToImportAgainstExisting(['A'], ['a']);
    expect(result.toCreate).toEqual([]);
    expect(result.skipped).toBe(1);
  });
});
