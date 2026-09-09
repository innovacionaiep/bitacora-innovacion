'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { chileRegionPathBBox, chileRegionViewBox } from '@/lib/chile-horizontal-paths';
import type { ChileRegionPath } from '@/lib/chile-horizontal-paths';
import type { AiepSedePin } from '@/lib/aiep-sede-geo';
import {
  layoutFloatingMapCards,
  layoutSedeLabels,
  METROPOLITANA_REGION_ID,
  sedeLabelParts,
  zoomPinRadius,
} from '@/lib/aiep-sede-geo';
import { VitrinaCoverCrop } from '@/components/vitrina/VitrinaCoverCrop';

const CARD_WIDTH = 115;
const CARD_HEIGHT = 90;
const CARD_GUTTER = CARD_WIDTH + 18;
const SEDE_LABEL_PX = 10;

type OverlayRect = { left: number; top: number; width: number; height: number };

export function ChileRegionZoom({
  region,
  pins,
  onOpenProyecto,
}: {
  region: ChileRegionPath;
  pins: AiepSedePin[];
  onOpenProyecto?: (id: string) => void;
}) {
  const isMetropolitana = region.id === METROPOLITANA_REGION_ID;
  const gutterX = CARD_GUTTER + (isMetropolitana ? CARD_WIDTH : 0);
  const gutterY = isMetropolitana ? CARD_HEIGHT + 20 : 0;
  const box = chileRegionPathBBox(region.d);
  const tightBox = chileRegionPathBBox(region.d, 0);
  const minDim = Math.min(box.width, box.height);
  const svgRef = useRef<SVGSVGElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const [mapRect, setMapRect] = useState<OverlayRect | null>(null);
  const [labelPxPerUnit, setLabelPxPerUnit] = useState(1);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const overlay = overlayRef.current;
    if (!svg || !overlay) return;

    const userToOverlay = (
      x: number,
      y: number,
      rect: DOMRect,
      ctm: DOMMatrix | null,
      svgRect: DOMRect,
    ) => {
      if (ctm && svgRect.width > 0) {
        try {
          const point = svg.createSVGPoint();
          point.x = x;
          point.y = y;
          const screen = point.matrixTransform(ctm);
          return { x: screen.x - rect.left, y: screen.y - rect.top };
        } catch {
          /* jsdom */
        }
      }
      const width = rect.width || 480;
      const height = rect.height || 480;
      const scale = Math.min(width / box.width, height / box.height);
      const originX = (width - box.width * scale) / 2;
      const originY = (height - box.height * scale) / 2;
      return {
        x: originX + (x - box.minX) * scale,
        y: originY + (y - box.minY) * scale,
      };
    };

    const update = () => {
      const rect = overlay.getBoundingClientRect();
      const width = rect.width || 480;
      const height = rect.height || 480;
      setOverlaySize({ width, height });
      const ctm = svg.getScreenCTM?.() ?? null;
      const svgRect = svg.getBoundingClientRect();
      const meet = Math.min(
        (svgRect.width || width) / box.width,
        (svgRect.height || height) / box.height,
      );
      setLabelPxPerUnit(Math.max(meet, 0.01));
      const next: Record<string, { x: number; y: number }> = {};
      for (const pin of pins) {
        next[pin.id] = userToOverlay(pin.x, pin.y, rect, ctm, svgRect);
      }
      setPositions(next);
      const tl = userToOverlay(
        tightBox.minX,
        tightBox.minY,
        rect,
        ctm,
        svgRect,
      );
      const br = userToOverlay(
        tightBox.minX + tightBox.width,
        tightBox.minY + tightBox.height,
        rect,
        ctm,
        svgRect,
      );
      setMapRect({
        left: Math.min(tl.x, br.x),
        top: Math.min(tl.y, br.y),
        width: Math.abs(br.x - tl.x),
        height: Math.abs(br.y - tl.y),
      });
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [
    box.height,
    box.minX,
    box.minY,
    box.width,
    pins,
    region.d,
    tightBox.height,
    tightBox.minX,
    tightBox.minY,
    tightBox.width,
  ]);

  const cards = useMemo(
    () =>
      mapRect
        ? layoutFloatingMapCards({
            pins,
            positions,
            width: overlaySize.width,
            height: overlaySize.height,
            cardWidth: CARD_WIDTH,
            cardHeight: CARD_HEIGHT,
            mapRect,
            regionId: region.id,
          })
        : [],
    [mapRect, overlaySize.height, overlaySize.width, pins, positions, region.id],
  );

  const fontSize = SEDE_LABEL_PX / labelPxPerUnit;
  const labelAnchors = useMemo(
    () =>
      layoutSedeLabels(
        pins.map((pin) => ({
          id: pin.id,
          x: pin.x,
          y: pin.y,
          label: pin.label,
        })),
        {
          fontSize,
          regionId: region.id,
          radius: (id) =>
            zoomPinRadius(
              pins.find((pin) => pin.id === id)?.nombres.length ?? 1,
              minDim,
            ),
        },
      ),
    [fontSize, minDim, pins, region.id],
  );
  const labelsByPin = useMemo(
    () => new Map(labelAnchors.map((anchor) => [anchor.pinId, anchor])),
    [labelAnchors],
  );

  return (
    <div
      className="flex h-full w-full min-h-0 flex-col items-center overflow-visible bg-transparent"
      role="group"
      aria-label={`${region.name} ampliada`}
    >
      <p className="mb-3 shrink-0 px-4 text-center text-base font-semibold text-slate-800">
        {region.name}
      </p>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-visible px-2">
        <div
          ref={overlayRef}
          className="relative h-full w-full overflow-visible"
        >
          <div
            className="pointer-events-none absolute left-1/2 max-w-full -translate-x-1/2"
            style={{
              aspectRatio: `${box.width} / ${box.height}`,
              maxWidth: `calc(100% - ${gutterX * 2}px)`,
              top: gutterY,
              height: `calc(100% - ${gutterY * 2}px)`,
            }}
          >
            <svg
              ref={svgRef}
              viewBox={chileRegionViewBox(region.d)}
              className="pointer-events-auto h-full w-full overflow-visible bg-transparent"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d={region.d}
                aria-hidden
                className="chile-region-zoom-path"
                fill="#e2e8f0"
                stroke="#cbd5e1"
              />
              {pins.map((pin, index) => {
                const r = zoomPinRadius(pin.nombres.length, minDim);
                const label = sedeLabelParts(pin.label);
                const anchor = labelsByPin.get(pin.id);
                return (
                  <g key={pin.id}>
                    {anchor?.lineTo ? (
                      <line
                        x1={anchor.lineTo.x}
                        y1={anchor.lineTo.y}
                        x2={anchor.x}
                        y2={(anchor.yTop + anchor.yBottom) / 2}
                        stroke="#94a3b8"
                        strokeWidth={Math.max(minDim * 0.0025, 0.08)}
                        aria-hidden
                      />
                    ) : null}
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={r}
                      aria-hidden
                      fill="#1e293b"
                      stroke="#fff"
                      className="vitrina-map-pin"
                      style={{
                        animationDelay: `${index * 90}ms`,
                        strokeWidth: Math.max(minDim * 0.0035, 0.12),
                      }}
                    />
                    <text
                      textAnchor={anchor?.textAnchor ?? 'middle'}
                      fill="#64748b"
                      fontSize={fontSize}
                      fontWeight={500}
                      aria-label={`Sede ${label.bottom}`}
                    >
                      <tspan x={anchor?.x ?? pin.x} y={anchor?.yTop ?? pin.y - r}>
                        {label.top}
                      </tspan>
                      <tspan
                        x={anchor?.x ?? pin.x}
                        y={anchor?.yBottom ?? pin.y - r}
                      >
                        {label.bottom}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          {cards.map((card) => (
            <button
              type="button"
              key={`${card.pinId}-${card.proyecto.id}`}
              className="absolute z-[1] overflow-hidden rounded-xl border-2 border-white bg-white text-left shadow-md"
              style={{
                width: CARD_WIDTH,
                left: card.left,
                top: card.top,
              }}
              onClick={() => onOpenProyecto?.(card.proyecto.id)}
              aria-label={card.proyecto.nombre}
            >
              <div className="relative aspect-[2/1] w-full overflow-hidden bg-white">
                {card.proyecto.fotoUrl ? (
                  <VitrinaCoverCrop
                    url={card.proyecto.fotoUrl}
                    offsetX={card.proyecto.coverOffsetX}
                    offsetY={card.proyecto.coverOffsetY}
                    zoom={card.proyecto.coverZoom}
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-slate-200" />
                )}
              </div>
              <p className="line-clamp-2 px-1.5 py-1 text-center text-[10px] font-semibold leading-snug text-slate-800">
                {card.proyecto.nombre}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
