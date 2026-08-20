import { describe, expect, it } from 'vitest';
import {
  isOptionalEmailValid,
  socioComunitarioIsInUse,
} from '@/lib/socios-comunitarios';

describe('isOptionalEmailValid', () => {
  it('acepta vacío, null y solo espacios', () => {
    expect(isOptionalEmailValid('')).toBe(true);
    expect(isOptionalEmailValid('   ')).toBe(true);
    expect(isOptionalEmailValid(null)).toBe(true);
    expect(isOptionalEmailValid(undefined)).toBe(true);
  });

  it('acepta un email con formato básico', () => {
    expect(isOptionalEmailValid('contacto@junta.cl')).toBe(true);
    expect(isOptionalEmailValid('  a.b@x.co  ')).toBe(true);
  });

  it('rechaza email mal formado', () => {
    expect(isOptionalEmailValid('sin-arroba')).toBe(false);
    expect(isOptionalEmailValid('a@')).toBe(false);
    expect(isOptionalEmailValid('@dominio.cl')).toBe(false);
    expect(isOptionalEmailValid('a@b')).toBe(false);
  });
});

describe('socioComunitarioIsInUse', () => {
  it('no está en uso si no hay proyectos ni participantes', () => {
    expect(socioComunitarioIsInUse({ proyectos: 0, participantes: 0 })).toBe(
      false
    );
  });

  it('está en uso si hay join de proyecto', () => {
    expect(socioComunitarioIsInUse({ proyectos: 1, participantes: 0 })).toBe(
      true
    );
  });

  it('está en uso si hay participantes', () => {
    expect(socioComunitarioIsInUse({ proyectos: 0, participantes: 2 })).toBe(
      true
    );
  });
});
