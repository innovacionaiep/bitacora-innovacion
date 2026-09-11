import { describe, expect, it } from 'vitest';
import {
  VITRINA_SEDE_EMPRENDEDOR_EXTERNO,
  vitrinaCardUsesComunasInPlaceOfEscuelas,
} from '@/lib/vitrina-card-display';

describe('vitrinaCardUsesComunasInPlaceOfEscuelas', () => {
  it('es verdadero si la sede es Emprendedor/a Externo', () => {
    expect(
      vitrinaCardUsesComunasInPlaceOfEscuelas([VITRINA_SEDE_EMPRENDEDOR_EXTERNO]),
    ).toBe(true);
    expect(
      vitrinaCardUsesComunasInPlaceOfEscuelas(['  emprendedor/a externo  ']),
    ).toBe(true);
  });

  it('es falso para sedes territoriales', () => {
    expect(vitrinaCardUsesComunasInPlaceOfEscuelas(['Rancagua'])).toBe(false);
    expect(vitrinaCardUsesComunasInPlaceOfEscuelas([])).toBe(false);
  });
});
