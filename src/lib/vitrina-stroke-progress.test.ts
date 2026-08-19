import { describe, expect, it } from 'vitest';
import {
  strokeDashoffsetForProgress,
  strokeProgressForSegment,
} from '@/lib/vitrina-stroke-progress';

describe('strokeProgressForSegment', () => {
  it('está en 0 al inicio para todos los paths', () => {
    expect(strokeProgressForSegment(0, 0, 4)).toBe(0);
    expect(strokeProgressForSegment(0, 3, 4)).toBe(0);
  });

  it('completa el primer path a 25% de progreso global', () => {
    expect(strokeProgressForSegment(0.25, 0, 4)).toBe(1);
    expect(strokeProgressForSegment(0.25, 1, 4)).toBe(0);
  });

  it('dibuja a medias el segundo path', () => {
    expect(strokeProgressForSegment(0.375, 0, 4)).toBe(1);
    expect(strokeProgressForSegment(0.375, 1, 4)).toBeCloseTo(0.5);
    expect(strokeProgressForSegment(0.375, 2, 4)).toBe(0);
  });

  it('completa todos los paths al 100%', () => {
    expect(strokeProgressForSegment(1, 0, 4)).toBe(1);
    expect(strokeProgressForSegment(1, 3, 4)).toBe(1);
  });

  it('borra en orden inverso al bajar el progreso', () => {
    expect(strokeProgressForSegment(0.5, 1, 4)).toBe(1);
    expect(strokeProgressForSegment(0.5, 2, 4)).toBe(0);
    expect(strokeProgressForSegment(0.2, 0, 4)).toBeCloseTo(0.8);
    expect(strokeProgressForSegment(0.2, 1, 4)).toBe(0);
  });

  it('devuelve 0 si no hay paths', () => {
    expect(strokeProgressForSegment(1, 0, 0)).toBe(0);
  });
});

describe('strokeDashoffsetForProgress', () => {
  it('oculta el trazo cuando el segmento aún no empieza', () => {
    expect(strokeDashoffsetForProgress(0)).toBe(1);
  });

  it('revela el trazo completo', () => {
    expect(strokeDashoffsetForProgress(1)).toBe(0);
  });

  it('revela a medias', () => {
    expect(strokeDashoffsetForProgress(0.5)).toBeCloseTo(0.5);
  });
});
