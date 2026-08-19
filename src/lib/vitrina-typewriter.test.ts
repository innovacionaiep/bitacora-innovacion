import { describe, expect, it } from 'vitest';
import { vitrinaTypewriterProgress } from '@/lib/vitrina-typewriter';

describe('vitrinaTypewriterProgress', () => {
  it('es 0 cuando no hay letras mostradas', () => {
    expect(vitrinaTypewriterProgress('', 'social')).toBe(0);
  });

  it('es 1 cuando el texto está completo', () => {
    expect(vitrinaTypewriterProgress('social', 'social')).toBe(1);
  });

  it('avanza con cada letra', () => {
    expect(vitrinaTypewriterProgress('soc', 'social')).toBeCloseTo(0.5);
  });

  it('baja al borrar letras', () => {
    expect(vitrinaTypewriterProgress('s', 'social')).toBeCloseTo(1 / 6);
  });

  it('no se pasa de 1 si displayed es más largo', () => {
    expect(vitrinaTypewriterProgress('socialextra', 'social')).toBe(1);
  });

  it('es 1 si la palabra está vacía', () => {
    expect(vitrinaTypewriterProgress('', '')).toBe(1);
  });
});
