import { describe, expect, it } from 'vitest';
import {
  formatCarreraTitulo,
  foldCarreraMatchKey,
  pickPreferredCarreraSource,
} from '@/lib/vitrina-carrera-titulo';

describe('formatCarreraTitulo', () => {
  it('deja conceptos con inicial mayúscula y conectores en minúscula', () => {
    expect(formatCarreraTitulo('Técnico En Cosmetología')).toBe(
      'Técnico en Cosmetología',
    );
    expect(formatCarreraTitulo('TÉCNICO EN COSMETOLOGÍA')).toBe(
      'Técnico en Cosmetología',
    );
    expect(
      formatCarreraTitulo('ingeniería DE ejecución EN INFORMÁTICA'),
    ).toBe('Ingeniería de Ejecución en Informática');
  });

  it('capitaliza conceptos entre paréntesis', () => {
    expect(formatCarreraTitulo('Técnico (profesional) En Cosmetología')).toBe(
      'Técnico (Profesional) en Cosmetología',
    );
    expect(formatCarreraTitulo('TÉCNICO (PROFESIONAL)')).toBe(
      'Técnico (Profesional)',
    );
    expect(formatCarreraTitulo('Técnico(profesional)')).toBe(
      'Técnico(Profesional)',
    );
  });
});

describe('foldCarreraMatchKey', () => {
  it('iguala mayúsculas, tildes y espacios', () => {
    expect(foldCarreraMatchKey('Técnico  En Cosmetología')).toBe(
      foldCarreraMatchKey('TECNICO EN COSMETOLOGIA'),
    );
  });
});

describe('pickPreferredCarreraSource', () => {
  it('prefiere la variante con más tildes', () => {
    expect(
      pickPreferredCarreraSource([
        'TECNICO EN COSMETOLOGIA',
        'Técnico En Cosmetología',
      ]),
    ).toBe('Técnico En Cosmetología');
  });
});
