'use client';

import type { ReactNode } from 'react';

import {
  IGIP_RADAR_CX,
  IGIP_RADAR_CY,
  IGIP_RADAR_RADIUS,
  IGIP_RADAR_VIEW,
  IGIP_SCORE_MAX,
  IGIP_SUBDIMENSIONS,
  radarLabelSlot,
  radarPolygonPoints,
  radarVertex,
} from '@/lib/igip-trl';
import { cn } from '@/lib/utils';

export const IGIP_RADAR_LABEL_ALIGN_CLASS: Record<
  ReturnType<typeof radarLabelSlot>['align'],
  string
> = {
  top: '-translate-x-1/2 -translate-y-[calc(100%+0.2rem-10px)] items-center text-center',
  topRight:
    '-translate-x-1/2 -translate-y-[calc(100%+0.2rem)] items-center text-center',
  bottomRight:
    '-translate-x-[calc(50%-15px)] translate-y-1 items-center text-center',
  bottom: '-translate-x-1/2 translate-y-[calc(2.5rem-35px)] items-center text-center',
  bottomLeft:
    '-translate-x-[calc(50%+15px)] translate-y-[calc(0.25rem+15px)] items-center text-center',
  topLeft:
    '-translate-x-1/2 -translate-y-[calc(100%+0.2rem)] items-center text-center',
};

export type IgipRadarChartLayer = {
  id: string;
  scores: Array<number | null>;
  fill: string;
  stroke: string;
  strokeWidth?: number;
};

export function IgipRadarChart({
  layers,
  className,
  ariaLabel = 'Gráfico radial de subdimensiones IGIP',
  children,
}: {
  layers: IgipRadarChartLayer[];
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const rings = [1, 2, 3, 4].map((level) =>
    radarPolygonPoints(
      Array.from({ length: 6 }, () => level),
      {
        cx: IGIP_RADAR_CX,
        cy: IGIP_RADAR_CY,
        radius: IGIP_RADAR_RADIUS,
      },
    ),
  );
  const axes = IGIP_SUBDIMENSIONS.map((_, index) =>
    radarVertex(index, IGIP_SCORE_MAX, {
      count: 6,
      cx: IGIP_RADAR_CX,
      cy: IGIP_RADAR_CY,
      radius: IGIP_RADAR_RADIUS,
    }),
  );

  return (
    <div
      className={cn(
        'relative mx-auto aspect-square w-full max-w-[42rem] min-h-[24rem] -mt-6 translate-y-[30px] overflow-visible pb-10',
        className,
      )}
      data-testid="igip-trl-radar"
      data-tour="igip-trl-radar"
    >
      <svg
        viewBox={`0 0 ${IGIP_RADAR_VIEW} ${IGIP_RADAR_VIEW}`}
        className="absolute inset-x-[16%] top-[8%] bottom-[24%]"
        role="img"
        aria-label={ariaLabel}
      >
        {rings.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1.25}
          />
        ))}
        {axes.map((p, i) => (
          <line
            key={i}
            x1={IGIP_RADAR_CX}
            y1={IGIP_RADAR_CY}
            x2={p.x}
            y2={p.y}
            stroke="#d1d5db"
            strokeWidth={1.25}
          />
        ))}
        {layers.map((layer) => {
          const points = radarPolygonPoints(layer.scores, {
            cx: IGIP_RADAR_CX,
            cy: IGIP_RADAR_CY,
            radius: IGIP_RADAR_RADIUS,
          });
          const isDestino = layer.id === 'destino';
          return (
            <g key={layer.id} data-layer={layer.id}>
              <polygon
                points={points}
                fill={layer.fill}
                stroke="none"
              />
              <polygon
                points={points}
                fill="none"
                stroke={layer.stroke}
                strokeWidth={
                  layer.strokeWidth ?? (isDestino ? 2 : 2.5)
                }
                strokeLinejoin="round"
                strokeOpacity={isDestino ? 0.75 : 1}
              />
            </g>
          );
        })}
      </svg>
      {children}
    </div>
  );
}

export function IgipRadarVertexSlot({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  const slot = radarLabelSlot(index, { cy: 42 });
  const topPct = slot.align === 'bottom' ? slot.yPct + 4 : slot.yPct;
  return (
    <div
      className={cn(
        'absolute z-10 flex w-[10.5rem] max-w-[46%] flex-col gap-1',
        IGIP_RADAR_LABEL_ALIGN_CLASS[slot.align],
        className,
      )}
      style={{ left: `${slot.xPct}%`, top: `${topPct}%` }}
    >
      {children}
    </div>
  );
}
