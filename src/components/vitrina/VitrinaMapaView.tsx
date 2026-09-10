'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ChileOnlineZoom } from '@/components/vitrina/ChileOnlineZoom';
import { ChileVerticalMap } from '@/components/vitrina/ChileHorizontalMap';
import { ChileRegionZoom } from '@/components/vitrina/ChileRegionZoom';
import {
  groupVitrinaProyectosByRegion,
  groupVitrinaProyectosBySede,
  pinsForOnline,
  pinsForRegion,
} from '@/lib/aiep-sede-geo';
import { chileRegionById } from '@/lib/chile-horizontal-paths';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export function VitrinaMapaView({
  proyectos,
  onBack,
  onOpenProyecto,
}: {
  proyectos: VitrinaProyecto[];
  onBack: () => void;
  onOpenProyecto?: (id: string) => void;
}) {
  const pins = useMemo(
    () => groupVitrinaProyectosBySede(proyectos),
    [proyectos],
  );
  const regionPins = useMemo(
    () => groupVitrinaProyectosByRegion(pins),
    [pins],
  );
  const [selection, setSelection] = useState<number | 'online' | null>(null);

  const region =
    selection == null || selection === 'online'
      ? null
      : chileRegionById(selection) ?? null;
  const sedePins = pinsForRegion(pins, typeof selection === 'number' ? selection : null);
  const onlinePins = useMemo(() => pinsForOnline(pins), [pins]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-transparent">
      <div className="absolute left-4 top-4 z-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 gap-2 overflow-visible pb-6 pl-16 pr-14 pt-12">
        <div className="h-full w-[380px] shrink-0 overflow-visible">
          <ChileVerticalMap
            selectedRegionId={typeof selection === 'number' ? selection : null}
            selectedOnline={selection === 'online'}
            regionPins={regionPins}
            onSelectRegion={setSelection}
            onSelectOnline={() => setSelection('online')}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible pr-2">
          {selection === 'online' ? (
            <ChileOnlineZoom
              pins={onlinePins}
              onOpenProyecto={onOpenProyecto}
            />
          ) : region ? (
            <ChileRegionZoom
              region={region}
              pins={sedePins}
              onOpenProyecto={onOpenProyecto}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
              Haz clic en una región a la izquierda para ampliarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
