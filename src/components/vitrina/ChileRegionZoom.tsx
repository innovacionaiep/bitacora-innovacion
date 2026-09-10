'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  chileRegionDisplayName,
  chileRegionPathBBox,
  chileRegionViewBox,
} from '@/lib/chile-horizontal-paths';
import type { ChileRegionPath } from '@/lib/chile-horizontal-paths';
import type { AiepSedePin } from '@/lib/aiep-sede-geo';
import {
  layoutFloatingMapCards,
  layoutOverlaySedeLabelsNearCards,
  layoutSedeLabels,
  LOS_LAGOS_REGION_ID,
  METROPOLITANA_REGION_ID,
  OHIGGINS_REGION_ID,
  sedeLabelParts,
  usesOverlaySedeLabel,
  VALPARAISO_REGION_ID,
  VITRINA_MAP_LABEL_PX,
  zoomPinRadius,
} from '@/lib/aiep-sede-geo';
import { VitrinaCoverCrop } from '@/components/vitrina/VitrinaCoverCrop';

const CARD_WIDTH = 115;
const CARD_HEIGHT = 90;
const CARD_GUTTER = CARD_WIDTH + 18;
/** Padding mínimo entre grupos de tarjetas de sedes distintas. */
const CARD_GROUP_GAP = 28;
/** Distancia entre el borde del mapa y el grupo de tarjetas (RM / Santiago Norte). */
const MAP_CARD_MARGIN = 44;
/** Regiones compass sin achicar el mapa regional. */
const COMPACT_CARD_MARGIN = 12;
/**
 * Aire bajo las tarjetas inferiores.
 * Igual a `pb-6` del contenedor del mapa nacional en VitrinaMapaView.
 */
const CARD_BOTTOM_EDGE_PAD = 24;

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
  const compactCompass =
    region.id === LOS_LAGOS_REGION_ID ||
    region.id === OHIGGINS_REGION_ID ||
    region.id === VALPARAISO_REGION_ID;
  const gutterX = isMetropolitana ? CARD_GUTTER + CARD_WIDTH : CARD_GUTTER;
  // Solo RM agranda gutters; Valparaíso/Los Lagos/O'Higgins mantienen el zoom del mapa.
  const gutterY = isMetropolitana
    ? CARD_HEIGHT + MAP_CARD_MARGIN + CARD_GROUP_GAP + 24
    : 0;
  const mapCardMargin = isMetropolitana
    ? MAP_CARD_MARGIN
    : compactCompass
      ? COMPACT_CARD_MARGIN
      : 10;
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
            height: Math.max(overlaySize.height - CARD_BOTTOM_EDGE_PAD, 0),
            cardWidth: CARD_WIDTH,
            cardHeight: CARD_HEIGHT,
            mapRect,
            margin: mapCardMargin,
            groupGap: CARD_GROUP_GAP,
            regionId: region.id,
          })
        : [],
    [
      mapCardMargin,
      mapRect,
      overlaySize.height,
      overlaySize.width,
      pins,
      positions,
      region.id,
    ],
  );

  const fontSize = VITRINA_MAP_LABEL_PX / labelPxPerUnit;
  const overlayLabelPins = useMemo(
    () =>
      pins.filter((pin) => usesOverlaySedeLabel(region.id, pin.id)),
    [pins, region.id],
  );
  const overlayLabels = useMemo(
    () =>
      overlayLabelPins.length > 0 && mapRect
        ? layoutOverlaySedeLabelsNearCards({
            pins: overlayLabelPins.map((pin) => ({
              id: pin.id,
              label: pin.label,
            })),
            positions,
            cards,
            cardWidth: CARD_WIDTH,
            cardHeight: CARD_HEIGHT,
            regionId: region.id,
            labelFontPx: VITRINA_MAP_LABEL_PX,
            gap: 8,
          })
        : [],
    [cards, mapRect, overlayLabelPins, positions, region.id],
  );
  const overlayPinIds = useMemo(
    () => new Set(overlayLabels.map((item) => item.pinId)),
    [overlayLabels],
  );
  const labelAnchors = useMemo(
    () =>
      layoutSedeLabels(
        pins
          .filter((pin) => !overlayPinIds.has(pin.id))
          .map((pin) => ({
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
    [fontSize, minDim, overlayPinIds, pins, region.id],
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
      <header
        key={region.id}
        aria-label={region.name}
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
              Región
            </p>
            <h2 className="mx-auto mt-0.5 max-w-md text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-800">
              {chileRegionDisplayName(region.name)}
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
              className="chile-region-zoom-svg pointer-events-auto h-full w-full overflow-visible bg-transparent"
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
                const skipSvgLabel = overlayPinIds.has(pin.id);
                return (
                  <g key={pin.id}>
                    {!skipSvgLabel && anchor?.lineTo ? (
                      <line
                        x1={anchor.lineTo.x}
                        y1={anchor.lineTo.y}
                        x2={anchor.x}
                        y2={(anchor.yTop + anchor.yBottom) / 2}
                        stroke="#64748b"
                        strokeOpacity={0.55}
                        strokeWidth={Math.max(minDim * 0.002, 0.06)}
                        aria-hidden
                      />
                    ) : null}
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={r}
                      aria-hidden
                      fill="#475569"
                      stroke="#fff"
                      className="vitrina-map-pin"
                      style={{
                        animationDelay: `${index * 90}ms`,
                        strokeWidth: Math.max(minDim * 0.0035, 0.12),
                      }}
                    />
                    {!skipSvgLabel ? (
                      <text
                        textAnchor={anchor?.textAnchor ?? 'middle'}
                        fill="#64748b"
                        fontSize={fontSize}
                        fontWeight={500}
                        aria-label={`Sede ${label.bottom}`}
                      >
                        <tspan
                          x={anchor?.x ?? pin.x}
                          y={anchor?.yTop ?? pin.y - r}
                        >
                          {label.top}
                        </tspan>
                        <tspan
                          x={anchor?.x ?? pin.x}
                          y={anchor?.yBottom ?? pin.y - r}
                        >
                          {label.bottom}
                        </tspan>
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
          {overlayLabels.length > 0 && overlaySize.width > 0 ? (
            <svg
              className="pointer-events-none absolute inset-0 z-0 overflow-visible"
              width={overlaySize.width}
              height={overlaySize.height}
              aria-hidden
            >
              {overlayLabels.map((item) => (
                <line
                  key={`line-${item.pinId}`}
                  x1={item.lineTo.x}
                  y1={item.lineTo.y}
                  x2={item.lineFrom.x}
                  y2={item.lineFrom.y}
                  stroke="#64748b"
                  strokeOpacity={0.55}
                  strokeWidth={1.1}
                />
              ))}
            </svg>
          ) : null}
          {overlayLabels.map((item) => {
            const parts = sedeLabelParts(item.label);
            return (
              <div
                key={`label-${item.pinId}`}
                className="pointer-events-none absolute z-[2] rounded px-0.5 leading-tight text-slate-500 [text-shadow:0_0_3px_#fff,0_0_6px_#fff]"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                  fontSize: VITRINA_MAP_LABEL_PX,
                  fontWeight: 500,
                  textAlign: item.textAlign,
                }}
                aria-label={`Sede ${parts.bottom}`}
              >
                <div>{parts.top}</div>
                <div>{parts.bottom}</div>
              </div>
            );
          })}
          {cards.map((card) => (
            <button
              type="button"
              key={`${card.pinId}-${card.proyecto.id}`}
              className="absolute z-[1] cursor-pointer overflow-hidden rounded-xl border-2 border-white bg-white text-left shadow-md transition-[border-color,box-shadow,transform] duration-150 hover:z-[3] hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-lg"
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
