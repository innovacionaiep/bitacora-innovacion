import { describe, it, expect } from 'vitest';
import { chunkInBursts, dequeueTab, runInBursts } from '@/lib/idle-burst';
import {
  ALL_PREFETCH_TABS,
  IDLE_DATA_PREFETCH_TABS,
  IDLE_TAB_PREFETCH_CONCURRENCY,
} from '@/hooks/useProyectoQuery';

describe('dequeueTab', () => {
  it('pulls the clicked tab out of the remaining idle queue', () => {
    expect(dequeueTab(['A', 'B', 'C', 'D'], 'C')).toEqual(['A', 'B', 'D']);
  });
});

describe('chunkInBursts', () => {
  it('never puts more than concurrency items in one burst', () => {
    const bursts = chunkInBursts(
      ALL_PREFETCH_TABS,
      IDLE_TAB_PREFETCH_CONCURRENCY
    );
    expect(IDLE_TAB_PREFETCH_CONCURRENCY).toBe(2);
    expect(ALL_PREFETCH_TABS.length).toBeGreaterThan(2);
    expect(bursts.length).toBeGreaterThan(1);
    expect(bursts.every((b) => b.length <= 2)).toBe(true);
    expect(bursts.flat()).toEqual([...ALL_PREFETCH_TABS]);
  });

  it('has no idle data bursts when idle tab data is disabled', () => {
    const bursts = chunkInBursts(
      IDLE_DATA_PREFETCH_TABS,
      IDLE_TAB_PREFETCH_CONCURRENCY
    );
    expect(IDLE_DATA_PREFETCH_TABS).toEqual([]);
    expect(bursts).toEqual([]);
  });
});

describe('runInBursts', () => {
  it('does not start the next burst until the current one finishes', async () => {
    const started: number[] = [];
    const order: string[] = [];
    await runInBursts([1, 2, 3, 4], 2, async (n) => {
      started.push(n);
      order.push(`start-${n}`);
      await Promise.resolve();
      order.push(`end-${n}`);
    });
    expect(started).toEqual([1, 2, 3, 4]);
    const firstBurstEnded =
      order.indexOf('end-1') >= 0 && order.indexOf('end-2') >= 0;
    const secondBurstStarted = Math.min(
      order.indexOf('start-3'),
      order.indexOf('start-4')
    );
    expect(firstBurstEnded).toBe(true);
    expect(secondBurstStarted).toBeGreaterThan(
      Math.max(order.indexOf('end-1'), order.indexOf('end-2'))
    );
  });
});
