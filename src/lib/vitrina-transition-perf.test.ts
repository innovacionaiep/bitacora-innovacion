import { describe, expect, it } from 'vitest';
import {
  createFrameSampler,
  formatVitrinaPerfLine,
  shouldEnableVitrinaPerfProbe,
  summarizeTransitionFrames,
} from '@/lib/vitrina-transition-perf';

describe('shouldEnableVitrinaPerfProbe', () => {
  it('solo enuncia el overlay con ?perf=1 fuera de production', () => {
    expect(shouldEnableVitrinaPerfProbe('?perf=1', 'development')).toBe(true);
    expect(shouldEnableVitrinaPerfProbe('perf=1', 'test')).toBe(true);
    expect(shouldEnableVitrinaPerfProbe('?foo=1', 'development')).toBe(false);
    expect(shouldEnableVitrinaPerfProbe('?perf=1', 'production')).toBe(false);
  });
});

describe('createFrameSampler', () => {
  it('ignora el primer tick y registra deltas siguientes', () => {
    const sampler = createFrameSampler();
    sampler.tick(1000);
    sampler.tick(1016);
    sampler.tick(1040);
    expect(sampler.deltas()).toEqual([16, 24]);
  });
});

describe('summarizeTransitionFrames', () => {
  it('cuenta jank sobre 18ms y calcula FPS medio/mínimo', () => {
    const sample = summarizeTransitionFrames([16, 16, 20, 32], 1, 'ida');
    expect(sample.direction).toBe('ida');
    expect(sample.frameCount).toBe(4);
    expect(sample.jankFrames).toBe(2);
    expect(sample.longTasks).toBe(1);
    expect(sample.avgFps).toBe(48);
    expect(sample.minFps).toBe(31);
    expect(sample.durationMs).toBe(84);
  });

  it('aguanta una transición sin frames', () => {
    const sample = summarizeTransitionFrames([], 0, 'vuelta');
    expect(sample.avgFps).toBe(0);
    expect(sample.minFps).toBe(0);
    expect(sample.jankFrames).toBe(0);
  });
});

describe('formatVitrinaPerfLine', () => {
  it('formatea ida y vuelta para el overlay', () => {
    const sample = summarizeTransitionFrames([16, 16], 0, 'ida');
    expect(formatVitrinaPerfLine(sample)).toBe('ida FPS 63 (0 jank)');
  });
});
