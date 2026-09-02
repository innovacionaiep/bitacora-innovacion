import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { VitrinaVideoCarousel } from '@/components/vitrina/VitrinaVideoCarousel';
import type { VitrinaVideo } from '@/components/vitrina/vitrina-content';
import { vitrinaMarqueeRepeats, vitrinaMarqueeStaggerDelayS } from '@/lib/vitrina-marquee';

vi.mock('@/components/vitrina/vitrina-marquee.css', () => ({}));

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 800;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return 600;
    },
  });
});

afterEach(() => {
  cleanup();
});

function youtubeVideo(n: number): VitrinaVideo {
  return {
    title: `Video ${n}`,
    url: `https://www.youtube.com/watch?v=${String(n).padStart(11, 'a')}`,
  };
}

describe('VitrinaVideoCarousel', () => {
  it('no recorta la columna derecha con padding extra en el overflow', () => {
    const videos = Array.from({ length: 9 }, (_, i) => youtubeVideo(i + 1));
    const { container } = render(
      <VitrinaVideoCarousel videos={videos} live={false} />,
    );

    const cols = container.querySelectorAll('[data-testid="vitrina-marquee-col"]');
    expect(cols).toHaveLength(3);
    for (const col of cols) {
      expect(col.className).not.toMatch(/pt-\[/);
    }
  });

  it('desfasa la columna derecha con animation-delay, no con padding', () => {
    const videos = Array.from({ length: 9 }, (_, i) => youtubeVideo(i + 1));
    const { container } = render(
      <VitrinaVideoCarousel videos={videos} live={false} />,
    );

    const tracks = container.querySelectorAll(
      '[data-testid="vitrina-marquee-track"]',
    );
    expect(tracks).toHaveLength(3);
    expect((tracks[0] as HTMLElement).style.animationDelay).toBe('');
    expect((tracks[1] as HTMLElement).style.animationDelay).toBe('');

    const durationS = Number.parseFloat(
      (tracks[2] as HTMLElement).style.animationDuration,
    );
    const colW = 200;
    const repeats = vitrinaMarqueeRepeats(800, colW, 3);
    const expected = vitrinaMarqueeStaggerDelayS(durationS, colW, 3, repeats);
    expect((tracks[2] as HTMLElement).style.animationDelay).toBe(
      `${expected}s`,
    );
  });
});
