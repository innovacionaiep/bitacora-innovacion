'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createFrameSampler,
  formatVitrinaPerfLine,
  shouldEnableVitrinaPerfProbe,
  summarizeTransitionFrames,
  type VitrinaPerfDirection,
  type VitrinaPerfSample,
} from '@/lib/vitrina-transition-perf';

export function useVitrinaTransitionPerf(
  busy: boolean,
  direction: VitrinaPerfDirection | null,
) {
  const [enabled, setEnabled] = useState(false);
  const [ida, setIda] = useState<VitrinaPerfSample | null>(null);
  const [vuelta, setVuelta] = useState<VitrinaPerfSample | null>(null);
  const directionRef = useRef(direction);
  directionRef.current = direction;

  useEffect(() => {
    setEnabled(
      shouldEnableVitrinaPerfProbe(
        window.location.search,
        process.env.NODE_ENV,
      ),
    );
  }, []);

  useEffect(() => {
    if (!enabled || !busy || !directionRef.current) return;

    const sampler = createFrameSampler();
    let longTasks = 0;
    let raf = 0;
    let observer: PerformanceObserver | null = null;

    const loop = (now: number) => {
      sampler.tick(now);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver((list) => {
          longTasks += list.getEntries().length;
        });
        observer.observe({ type: 'longtask', buffered: false });
      } catch {
        observer = null;
      }
    }

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      const sample = summarizeTransitionFrames(
        sampler.deltas(),
        longTasks,
        directionRef.current ?? 'ida',
      );
      if (sample.direction === 'vuelta') setVuelta(sample);
      else setIda(sample);
    };
  }, [busy, enabled]);

  return { enabled, ida, vuelta };
}

export function VitrinaPerfOverlay({
  enabled,
  ida,
  vuelta,
}: {
  enabled: boolean;
  ida: VitrinaPerfSample | null;
  vuelta: VitrinaPerfSample | null;
}) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[100] rounded border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] leading-5 text-slate-800">
      <p>{ida ? formatVitrinaPerfLine(ida) : 'ida —'}</p>
      <p>{vuelta ? formatVitrinaPerfLine(vuelta) : 'vuelta —'}</p>
    </div>
  );
}
