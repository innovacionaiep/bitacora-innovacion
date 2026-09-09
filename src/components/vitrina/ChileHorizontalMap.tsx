'use client';

import {
  CHILE_MAP_VIEW,
  CHILE_REGION_PATHS,
} from '@/lib/chile-horizontal-paths';
import type { AiepRegionPin } from '@/lib/aiep-sede-geo';
import { nationalPinRadius } from '@/lib/aiep-sede-geo';

type ChileVerticalMapProps = {
  selectedRegionId?: number | null;
  onSelectRegion?: (id: number) => void;
  regionPins?: AiepRegionPin[];
};

export function ChileVerticalMap({
  selectedRegionId = null,
  onSelectRegion,
  regionPins = [],
}: ChileVerticalMapProps) {
  const { width, height } = CHILE_MAP_VIEW;
  return (
    <div
      className="h-full w-full bg-transparent"
      role="group"
      aria-label="Mapa de Chile, norte arriba"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full bg-transparent"
        preserveAspectRatio="xMidYMid meet"
      >
        <g stroke="#cbd5e1" strokeWidth="0.7" strokeLinejoin="round">
          {CHILE_REGION_PATHS.map((region) => {
            const selected = region.id === selectedRegionId;
            return (
              <path
                key={region.id}
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
      </svg>
    </div>
  );
}
