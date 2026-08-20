import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useVitrinaTypewriter } from '@/hooks/useVitrinaTypewriter';

const ITEMS = [
  { word: 'social', className: 'text-red-600' },
  { word: 'ambiental', className: 'text-emerald-600' },
] as const;

describe('useVitrinaTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('no avanza mientras paused es true', () => {
    const { result } = renderHook(() =>
      useVitrinaTypewriter(ITEMS, 2000, true),
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.displayed).toBe('');
    expect(result.current.progress).toBe(0);
  });

  it('deja de escribir al pausar a mitad de palabra', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useVitrinaTypewriter(ITEMS, 2000, paused),
      { initialProps: { paused: false } },
    );

    act(() => {
      vi.advanceTimersByTime(55);
    });
    act(() => {
      vi.advanceTimersByTime(55);
    });
    act(() => {
      vi.advanceTimersByTime(55);
    });
    expect(result.current.displayed).toBe('soc');

    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.displayed).toBe('soc');
  });
});
