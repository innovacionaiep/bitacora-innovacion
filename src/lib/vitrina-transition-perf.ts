export type VitrinaPerfDirection = 'ida' | 'vuelta';

export type VitrinaPerfSample = {
  direction: VitrinaPerfDirection;
  frameCount: number;
  jankFrames: number;
  avgFps: number;
  minFps: number;
  longTasks: number;
  durationMs: number;
};

export const VITRINA_JANK_MS = 18;

export function shouldEnableVitrinaPerfProbe(
  search: string,
  nodeEnv: string | undefined,
): boolean {
  if (nodeEnv === 'production') return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('perf') === '1';
}

export function createFrameSampler() {
  let last = 0;
  const deltas: number[] = [];
  return {
    tick(now: number) {
      if (last > 0) deltas.push(now - last);
      last = now;
    },
    deltas() {
      return deltas;
    },
  };
}

export function summarizeTransitionFrames(
  deltasMs: number[],
  longTasks: number,
  direction: VitrinaPerfDirection,
  jankMs = VITRINA_JANK_MS,
): VitrinaPerfSample {
  const frames = deltasMs.filter((delta) => delta > 0);
  const durationMs = frames.reduce((sum, delta) => sum + delta, 0);
  const maxDelta = frames.length > 0 ? Math.max(...frames) : 0;
  const avgFrame = frames.length > 0 ? durationMs / frames.length : 0;

  return {
    direction,
    frameCount: frames.length,
    jankFrames: frames.filter((delta) => delta > jankMs).length,
    avgFps: avgFrame > 0 ? Math.round(1000 / avgFrame) : 0,
    minFps: maxDelta > 0 ? Math.round(1000 / maxDelta) : 0,
    longTasks,
    durationMs,
  };
}

export function formatVitrinaPerfLine(sample: VitrinaPerfSample): string {
  return `${sample.direction} FPS ${sample.avgFps} (${sample.jankFrames} jank)`;
}
