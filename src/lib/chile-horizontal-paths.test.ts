import { describe, expect, it } from 'vitest';
import { chileRegionDisplayName } from '@/lib/chile-horizontal-paths';

describe('chileRegionDisplayName', () => {
  it('quita Región de / del y deja el nombre propio', () => {
    expect(chileRegionDisplayName('Región de Valparaíso')).toBe('Valparaíso');
    expect(chileRegionDisplayName('Región de Los Lagos')).toBe('Los Lagos');
    expect(chileRegionDisplayName('Región del Maule')).toBe('Maule');
    expect(chileRegionDisplayName('Región Metropolitana de Santiago')).toBe(
      'Metropolitana de Santiago',
    );
  });
});
