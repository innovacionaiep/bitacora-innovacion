import { describe, it, expect } from 'vitest';
import {
  GENERAL_CORE_SECTION_COUNT,
  initialGeneralReveal,
} from '@/lib/general-section-reveal';

describe('initialGeneralReveal', () => {
  it('starts at zero when opening from the listado shell', () => {
    expect(initialGeneralReveal(true, false)).toEqual({ core: 0, dt: 0 });
  });

  it('shows core immediately on a cached base without DT', () => {
    expect(initialGeneralReveal(false, false)).toEqual({
      core: GENERAL_CORE_SECTION_COUNT,
      dt: 0,
    });
  });

  it('shows everything immediately on a full cached project', () => {
    const next = initialGeneralReveal(false, true);
    expect(next.core).toBe(GENERAL_CORE_SECTION_COUNT);
    expect(next.dt).toBe(Number.POSITIVE_INFINITY);
  });
});
