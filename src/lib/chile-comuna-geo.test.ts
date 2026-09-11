import { describe, expect, it } from 'vitest';
import { resolveComunaGeo } from '@/lib/chile-comuna-geo';
import { chileRegionById, chileRegionPathBBox } from '@/lib/chile-horizontal-paths';

describe('resolveComunaGeo', () => {
  it('resuelve Valparaíso a la región 5 con proyección', () => {
    const point = resolveComunaGeo('Valparaíso');
    expect(point).toMatchObject({
      nombre: 'Valparaíso',
      regionId: 5,
      id: 'comuna-valparaiso',
    });
    expect(point?.lon).toBeCloseTo(-71.62, 1);
    expect(point?.lat).toBeCloseTo(-33.05, 1);
    expect(Number.isFinite(point?.x)).toBe(true);
    expect(Number.isFinite(point?.y)).toBe(true);
  });

  it('ignora mayúsculas y acentos', () => {
    expect(resolveComunaGeo('  valparaiso  ')?.nombre).toBe('Valparaíso');
    expect(resolveComunaGeo('ÑUÑOA')?.regionId).toBe(13);
  });

  it('omite nombres desconocidos', () => {
    expect(resolveComunaGeo('Comuna Inventada')).toBeNull();
    expect(resolveComunaGeo('')).toBeNull();
  });

  it('proyecta dentro del bbox aproximado de la región', () => {
    const point = resolveComunaGeo('Valparaíso');
    const region = chileRegionById(5);
    expect(point && region).toBeTruthy();
    const box = chileRegionPathBBox(region!.d, 40);
    expect(point!.x).toBeGreaterThanOrEqual(box.minX);
    expect(point!.x).toBeLessThanOrEqual(box.minX + box.width);
    expect(point!.y).toBeGreaterThanOrEqual(box.minY);
    expect(point!.y).toBeLessThanOrEqual(box.minY + box.height);
  });
});
