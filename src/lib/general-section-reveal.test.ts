import { describe, it, expect } from 'vitest';
import {
  GENERAL_CORE_SECTION_COUNT,
  initialGeneralReveal,
  visibleDtSectionCount,
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

describe('visibleDtSectionCount', () => {
  it('mounts no DT cards until the drip starts', () => {
    expect(visibleDtSectionCount(0, 8)).toBe(0);
  });

  it('mounts only the revealed prefix', () => {
    expect(visibleDtSectionCount(2, 8)).toBe(2);
  });

  it('mounts all cards on a full cache hit', () => {
    expect(visibleDtSectionCount(Number.POSITIVE_INFINITY, 8)).toBe(8);
  });
});
