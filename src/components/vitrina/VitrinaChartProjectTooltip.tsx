'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fitVitrinaChartTooltip } from '@/lib/vitrina-chart-tooltip-placement';

export function VitrinaProjectNameList({ nombres }: { nombres: string[] }) {
  return (
    <ul className="space-y-2.5">
      {nombres.map((nombre, index) => (
        <li
          key={`${nombre}-${index}`}
          className="flex items-start gap-1.5 text-xs leading-snug text-slate-800"
        >
          <span
            aria-hidden
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 rounded-[0.5px] bg-slate-400"
          />
          <span>{nombre}</span>
        </li>
      ))}
    </ul>
  );
}

const TOOLTIP_BOX_CLASS =
  'pointer-events-none fixed z-[80] max-h-64 w-max max-w-md overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg';

export function VitrinaChartProjectTooltip({
  title,
  nombres,
  x,
  y,
}: {
  title: string;
  nombres: string[];
  x: number;
  y: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState(() =>
    fitVitrinaChartTooltip({
      cursorX: x,
      cursorY: y,
      width: 0,
      height: 0,
      viewportWidth:
        typeof window === 'undefined' ? 1280 : window.innerWidth,
      viewportHeight:
        typeof window === 'undefined' ? 720 : window.innerHeight,
    }),
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    setPlaced(
      fitVitrinaChartTooltip({
        cursorX: x,
        cursorY: y,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }),
    );

    const onWheel = (event: WheelEvent) => {
      if (root.scrollHeight <= root.clientHeight) return;
      event.preventDefault();
      root.scrollTop += event.deltaY;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [x, y, nombres]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={rootRef}
      role="tooltip"
      className={TOOLTIP_BOX_CLASS}
      style={{ left: placed.left, top: placed.top }}
    >
      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
        {title}
      </p>
      <VitrinaProjectNameList nombres={nombres} />
    </div>,
    document.body,
  );
}
