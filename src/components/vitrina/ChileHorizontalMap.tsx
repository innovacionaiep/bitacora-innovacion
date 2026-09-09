'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  CHILE_MAP_VIEW,
  CHILE_REGION_PATHS,
  chileRegionPathBBox,
} from '@/lib/chile-horizontal-paths';
import type { AiepRegionPin } from '@/lib/aiep-sede-geo';
import {
  nationalPinRadius,
  VITRINA_MAP_HOVER_LABEL_PX,
} from '@/lib/aiep-sede-geo';
import { TRL_SELECTED_ARROW_PATH } from '@/components/ui/TrlSelectedArrow';

type ChileVerticalMapProps = {
  selectedRegionId?: number | null;
  onSelectRegion?: (id: number) => void;
  regionPins?: AiepRegionPin[];
};

function regionHoverLines(name: string): string[] {
  if (name.length <= 22) return [name];
  const idx = name.lastIndexOf(' ', 22);
  if (idx <= 0) return [name];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

export function ChileVerticalMap({
  selectedRegionId = null,
  onSelectRegion,
  regionPins = [],
}: ChileVerticalMapProps) {
  const { width, height } = CHILE_MAP_VIEW;
  const svgRef = useRef<SVGSVGElement>(null);
  const [pxPerUnit, setPxPerUnit] = useState(1);
  const selectedRegion =
    selectedRegionId == null
      ? null
      : (CHILE_REGION_PATHS.find((region) => region.id === selectedRegionId) ??
        null);
  const selectedBox = selectedRegion
    ? chileRegionPathBBox(selectedRegion.d, 0)
    : null;
  const hoverFontSize = VITRINA_MAP_HOVER_LABEL_PX / Math.max(pxPerUnit, 0.01);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const meet = Math.min(
        (rect.width || 220) / width,
        (rect.height || 800) / height,
      );
      setPxPerUnit(Math.max(meet, 0.01));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [height, width]);

  const arrowX = selectedBox
    ? 2 + Math.max(selectedBox.minX - 24, 0) * 0.5
    : 0;

  return (
    <div
      className="h-full w-full overflow-visible bg-transparent"
      role="group"
      aria-label="Mapa de Chile, norte arriba"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible bg-transparent"
        preserveAspectRatio="xMidYMid meet"
      >
        <g stroke="#cbd5e1" strokeWidth="0.7" strokeLinejoin="round">
          {CHILE_REGION_PATHS.map((region) => {
            const selected = region.id === selectedRegionId;
            const box = chileRegionPathBBox(region.d, 0);
            const lines = regionHoverLines(region.name);
            const labelX = box.minX + box.width + 8;
            const labelY = box.minY + box.height / 2;
            return (
              <g key={region.id} className="chile-region-hit">
                <path
                  d={region.d}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={region.name}
                  fill={selected ? '#10b981' : '#e2e8f0'}
                  className={
                    selected
                      ? 'chile-region-path chile-region-path-selected'
                      : 'chile-region-path'
                  }
                  onClick={() => onSelectRegion?.(region.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectRegion?.(region.id);
                    }
                  }}
                />
                <text
                  className="chile-region-hover-label"
                  data-region-hover-label={region.id}
                  x={labelX}
                  y={labelY}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={hoverFontSize}
                >
                  {lines.map((line, index) => (
                    <tspan
                      key={line}
                      x={labelX}
                      dy={index === 0 ? 0 : hoverFontSize * 1.2}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
        <g pointerEvents="none">
          {regionPins.map((pin) => (
            <circle
              key={pin.regionId}
              cx={pin.x}
              cy={pin.y}
              r={nationalPinRadius(pin.count)}
              data-national-pin={pin.regionId}
              fill="#1e293b"
              stroke="#fff"
              strokeWidth={1.4}
            />
          ))}
        </g>
        {selectedBox ? (
          <svg
            data-testid="trl-selected-chevron"
            x={arrowX}
            y={selectedBox.minY + selectedBox.height / 2 - 14}
            width={28}
            height={28}
            viewBox="0 0 24 24"
            overflow="visible"
            aria-hidden
          >
            <path
              d={TRL_SELECTED_ARROW_PATH}
              fill="#10b981"
              stroke="#10b981"
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </svg>
    </div>
  );
}
