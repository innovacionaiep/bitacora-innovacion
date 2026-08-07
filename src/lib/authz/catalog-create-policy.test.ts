import { describe, expect, it } from 'vitest';
import { catalogCreateRequiresAjustes } from './catalog-create-policy';

describe('catalogCreateRequiresAjustes', () => {
  it('socios comunitarios MUST NOT require view.ajustes', () => {
    expect(catalogCreateRequiresAjustes('socio_comunitario')).toBe(false);
  });

  it('configuración catalogs still require view.ajustes', () => {
    expect(catalogCreateRequiresAjustes('sede')).toBe(true);
    expect(catalogCreateRequiresAjustes('comuna')).toBe(true);
    expect(catalogCreateRequiresAjustes('escuela')).toBe(true);
    expect(catalogCreateRequiresAjustes('carrera')).toBe(true);
    expect(catalogCreateRequiresAjustes('grupo_interes')).toBe(true);
    expect(catalogCreateRequiresAjustes('asignatura')).toBe(true);
  });
});
