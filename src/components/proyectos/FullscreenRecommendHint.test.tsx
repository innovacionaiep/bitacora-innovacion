import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreenRecommendHint } from './FullscreenRecommendHint';

describe('useFullscreenRecommendHint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra el hint 2s después de ready y lo oculta 2,5s después', () => {
    const { result, rerender } = renderHook(
      ({ ready, active, enabled }) =>
        useFullscreenRecommendHint(ready, { active, enabled }),
      { initialProps: { ready: false, active: true, enabled: true } }
    );

    expect(result.current).toBe(false);

    rerender({ ready: true, active: true, enabled: true });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it('no muestra el hint si enabled es false (pantalla completa)', () => {
    const { result } = renderHook(() =>
      useFullscreenRecommendHint(true, { active: true, enabled: false })
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe(false);
  });

  it('cancela el hint pendiente al pasar a pantalla completa', () => {
    const { result, rerender } = renderHook(
      ({ ready, active, enabled }) =>
        useFullscreenRecommendHint(ready, { active, enabled }),
      { initialProps: { ready: true, active: true, enabled: true } }
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    rerender({ ready: true, active: true, enabled: false });

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(result.current).toBe(false);
  });

  it('vuelve a disparar al reentrar al tab (keep-alive)', () => {
    const { result, rerender } = renderHook(
      ({ ready, active, enabled }) =>
        useFullscreenRecommendHint(ready, { active, enabled }),
      { initialProps: { ready: true, active: true, enabled: true } }
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2_500);
    });
    expect(result.current).toBe(false);

    // Salir del tab (hidden keep-alive)
    rerender({ ready: true, active: false, enabled: true });
    // Volver a entrar
    rerender({ ready: true, active: true, enabled: true });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current).toBe(true);
  });
});
