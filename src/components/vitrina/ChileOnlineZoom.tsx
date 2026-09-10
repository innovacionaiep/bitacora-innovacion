'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import type { AiepSedePin } from '@/lib/aiep-sede-geo';
import {
  layoutFloatingMapCards,
  ONLINE_REGION_ID,
  splitOnlinePinAroundGlobe,
} from '@/lib/aiep-sede-geo';
import { VitrinaCoverCrop } from '@/components/vitrina/VitrinaCoverCrop';

const CARD_WIDTH = 115;
const CARD_HEIGHT = 90;
const CARD_GROUP_GAP = 28;
const CARD_BOTTOM_EDGE_PAD = 24;
const COMPACT_CARD_MARGIN = 12;
const GLOBE_SIZE = 220;

export function ChileOnlineZoom({
  pins,
  onOpenProyecto,
}: {
  pins: AiepSedePin[];
  onOpenProyecto?: (id: string) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [mapRect, setMapRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const globe = globeRef.current;
    if (!overlay || !globe) return;
    const update = () => {
      const overlayBox = overlay.getBoundingClientRect();
      const globeBox = globe.getBoundingClientRect();
      setOverlaySize({
        width: overlayBox.width || 480,
        height: overlayBox.height || 480,
      });
      setMapRect({
        left: globeBox.left - overlayBox.left,
        top: globeBox.top - overlayBox.top,
        width: globeBox.width,
        height: globeBox.height,
      });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(overlay);
    observer.observe(globe);
    return () => observer.disconnect();
  }, []);

  const compassPins = useMemo(() => {
    const source = pins.find((pin) => pin.proyectos.length > 0);
    return source ? splitOnlinePinAroundGlobe(source) : [];
  }, [pins]);

  const positions = useMemo(() => {
    if (!mapRect) return {};
    const cx = mapRect.left + mapRect.width / 2;
    const cy = mapRect.top + mapRect.height / 2;
    return {
      'online-n': { x: cx, y: mapRect.top },
      'online-e': { x: mapRect.left + mapRect.width, y: cy },
      'online-s': { x: cx, y: mapRect.top + mapRect.height },
      'online-w': { x: mapRect.left, y: cy },
    };
  }, [mapRect]);

  const cards = useMemo(
    () =>
      mapRect
        ? layoutFloatingMapCards({
            pins: compassPins,
            positions,
            width: overlaySize.width,
            height: Math.max(overlaySize.height - CARD_BOTTOM_EDGE_PAD, 0),
            cardWidth: CARD_WIDTH,
            cardHeight: CARD_HEIGHT,
            mapRect,
            margin: COMPACT_CARD_MARGIN,
            groupGap: CARD_GROUP_GAP,
            regionId: ONLINE_REGION_ID,
          })
        : [],
    [compassPins, mapRect, overlaySize.height, overlaySize.width, positions],
  );

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col items-center overflow-visible bg-transparent"
      role="group"
      aria-label="Sede Online ampliada"
    >
      <header
        aria-label="Sede Online"
        className="vitrina-region-title mb-3 shrink-0 px-4 text-center"
      >
        <div className="relative mx-auto flex w-fit flex-col items-stretch">
          <div
            className="vitrina-region-title-mosaic pointer-events-none absolute inset-x-0 top-[0.1875rem] bottom-[0.125rem]"
            aria-hidden
          />
          <div
            className="relative z-10 mb-1.5 flex h-1.5 items-center justify-center gap-2"
            aria-hidden
          >
            <span className="h-px w-32 bg-slate-300" />
            <span className="h-1.5 w-1.5 rotate-45 bg-emerald-500" />
            <span className="h-px w-32 bg-slate-300" />
          </div>
          <div className="relative z-10 px-3 py-1.5">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
              Sede
            </p>
            <h2 className="mx-auto mt-0.5 max-w-md text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-800">
              Online
            </h2>
          </div>
          <div
            className="relative z-10 mt-1.5 flex h-1 items-center justify-center gap-1.5"
            aria-hidden
          >
            <span className="h-px w-24 bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            <span className="h-px w-24 bg-slate-300" />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-visible px-2">
        <div
          ref={overlayRef}
          className="relative h-full w-full overflow-visible"
        >
          <div
            ref={globeRef}
            data-testid="online-sede-zoom-globe"
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
            style={{ width: GLOBE_SIZE, height: GLOBE_SIZE }}
            aria-hidden
          >
            <Globe
              className="h-full w-full text-[#e2e8f0]"
              fill="currentColor"
              stroke="#cbd5e1"
              strokeWidth={1.15}
            />
          </div>
          {cards.map((card) => (
            <button
              type="button"
              key={`${card.pinId}-${card.proyecto.id}`}
              className="absolute z-[1] cursor-pointer overflow-hidden rounded-lg border border-slate-200/80 bg-slate-200 text-left shadow-sm ring-2 ring-white transition-[border-color,box-shadow,transform] duration-150 hover:z-[3] hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                left: card.left,
                top: card.top,
              }}
              onClick={() => onOpenProyecto?.(card.proyecto.id)}
              aria-label={card.proyecto.nombre}
            >
              <div className="absolute inset-0 overflow-hidden bg-slate-200">
                {card.proyecto.fotoUrl ? (
                  <VitrinaCoverCrop
                    url={card.proyecto.fotoUrl}
                    offsetX={card.proyecto.coverOffsetX}
                    offsetY={card.proyecto.coverOffsetY}
                    zoom={card.proyecto.coverZoom}
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
                )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/75 via-slate-900/35 to-transparent px-1.5 pb-1.5 pt-6">
                <p className="line-clamp-2 text-left text-[10px] font-medium leading-snug tracking-tight text-white [text-shadow:0_1px_2px_rgb(15_23_42_/_0.7)]">
                  {card.proyecto.nombre}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
