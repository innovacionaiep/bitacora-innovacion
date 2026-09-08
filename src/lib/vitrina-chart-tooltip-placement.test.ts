import { describe, expect, it } from 'vitest';
import { fitVitrinaChartTooltip } from '@/lib/vitrina-chart-tooltip-placement';

describe('fitVitrinaChartTooltip', () => {
  it('coloca el tooltip abajo a la derecha cuando hay espacio', () => {
    expect(
      fitVitrinaChartTooltip({
        cursorX: 120,
        cursorY: 80,
        width: 280,
        height: 120,
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ).toEqual({ left: 134, top: 94 });
  });

  it('voltea a la izquierda si no cabe a la derecha, sin achicar el ancho', () => {
    expect(
      fitVitrinaChartTooltip({
        cursorX: 920,
        cursorY: 80,
        width: 280,
        height: 120,
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ).toEqual({ left: 626, top: 94 });
  });

  it('voltea hacia arriba si no cabe abajo', () => {
    expect(
      fitVitrinaChartTooltip({
        cursorX: 120,
        cursorY: 740,
        width: 200,
        height: 200,
        viewportWidth: 1000,
        viewportHeight: 800,
      }),
    ).toEqual({ left: 134, top: 526 });
  });

  it('mantiene el tooltip dentro del viewport en la esquina inferior derecha', () => {
    const placed = fitVitrinaChartTooltip({
      cursorX: 980,
      cursorY: 780,
      width: 280,
      height: 200,
      viewportWidth: 1000,
      viewportHeight: 800,
    });
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.left + 280).toBeLessThanOrEqual(992);
    expect(placed.top + 200).toBeLessThanOrEqual(792);
  });
});
