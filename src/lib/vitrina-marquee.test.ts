import { describe, expect, it } from 'vitest';
import {
  buildVitrinaColumnLists,
  vitrinaColumnChunkSizes,
} from '@/lib/vitrina-marquee';

describe('vitrinaColumnChunkSizes', () => {
  it('parte 26 videos en 9, 9 y 8', () => {
    expect(vitrinaColumnChunkSizes(26)).toEqual([9, 9, 8]);
  });

  it('parte 30 videos en tercios iguales', () => {
    expect(vitrinaColumnChunkSizes(30)).toEqual([10, 10, 10]);
  });
});

describe('buildVitrinaColumnLists', () => {
  it('asigna 1–9 izquierda, 10–18 derecha y 19–26 centro', () => {
    const items = Array.from({ length: 26 }, (_, i) => i + 1);
    const [left, center, right] = buildVitrinaColumnLists(items);
    expect(left).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(right).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(center).toEqual([19, 20, 21, 22, 23, 24, 25, 26]);
  });

  it('retorna columnas vacías si no hay videos', () => {
    expect(buildVitrinaColumnLists([])).toEqual([[], [], []]);
  });
});
