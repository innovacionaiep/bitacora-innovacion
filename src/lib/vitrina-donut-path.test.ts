import { describe, expect, it } from 'vitest';
import { donutSlicePath } from '@/lib/vitrina-donut-path';

describe('donutSlicePath', () => {
  it('redondea coordenadas para que servidor y cliente coincidan', () => {
    const d = donutSlicePath(88, 88, 78, 46, 0, 66.7);
    expect(d).not.toMatch(/\d+\.\d{4,}/);
    expect(d).toBe(donutSlicePath(88, 88, 78, 46, 0, 66.7));
    expect(d.startsWith('M 88 10 ')).toBe(true);
  });

  it('devuelve vacío si el tramo no tiene área', () => {
    expect(donutSlicePath(88, 88, 78, 46, 10, 10)).toBe('');
  });
});
