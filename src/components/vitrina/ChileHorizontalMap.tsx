'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Globe, Minus, Plus } from 'lucide-react';
import {
  CHILE_MAP_VIEW,
  CHILE_REGION_PATHS,
  chileRegionPathBBox,
  clampNationalMapZoom,
  NATIONAL_MAP_ZOOM_MAX,
  NATIONAL_MAP_ZOOM_MIN,
  NATIONAL_MAP_ZOOM_STEP,
  nationalMapViewBox,
  shiftNationalMapView,
  zoomNationalMapAt,
} from '@/lib/chile-horizontal-paths';
import type { AiepRegionPin } from '@/lib/aiep-sede-geo';
import {
  nationalPinRadius,
  VITRINA_MAP_HOVER_LABEL_PX,
} from '@/lib/aiep-sede-geo';
import { TRL_SELECTED_ARROW_PATH } from '@/components/ui/TrlSelectedArrow';

type ChileVerticalMapProps = {
  selectedRegionId?: number | null;
  selectedOnline?: boolean;
  onSelectRegion?: (id: number) => void;
  onSelectOnline?: () => void;
  regionPins?: AiepRegionPin[];
};

function regionHoverLines(name: string): string[] {
  if (name.length <= 22) return [name];
  const idx = name.lastIndexOf(' ', 22);
  if (idx <= 0) return [name];
  return [name.slice(0, idx), name.slice(idx + 1)];
}

function viewCenter(view: {
  minX: number;
  minY: number;
  width: number;
  height: number;
}) {
  return { x: view.minX + view.width / 2, y: view.minY + view.height / 2 };
}

export function ChileVerticalMap({
  selectedRegionId = null,
  selectedOnline = false,
  onSelectRegion,
  onSelectOnline,
  regionPins = [],
}: ChileVerticalMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    startX: number;
    startY: number;
    moved: boolean;
    regionId: number | null;
  } | null>(null);
  const [pxPerUnit, setPxPerUnit] = useState(1);
  const [zoom, setZoom] = useState(NATIONAL_MAP_ZOOM_MIN);
  const [center, setCenter] = useState({
    x: CHILE_MAP_VIEW.width / 2,
    y: CHILE_MAP_VIEW.height / 2,
  });
  const [hoveredRegionId, setHoveredRegionId] = useState<number | null>(null);
  const selectedRegion =
    selectedRegionId == null
      ? null
      : (CHILE_REGION_PATHS.find((region) => region.id === selectedRegionId) ??
        null);
  const selectedBox = selectedRegion
    ? chileRegionPathBBox(selectedRegion.d, 0)
    : null;
  const view = useMemo(
    () => nationalMapViewBox(zoom, center),
    [center, zoom],
  );
  const hoverFontSize = VITRINA_MAP_HOVER_LABEL_PX / Math.max(pxPerUnit, 0.01);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () => {
      const rect = svg.getBoundingClientRect();
      const meet = Math.min(
        (rect.width || 220) / view.width,
        (rect.height || 800) / view.height,
      );
      setPxPerUnit(Math.max(meet, 0.01));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [view.height, view.width]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const arrowX = selectedBox
    ? 2 + Math.max(selectedBox.minX - 24, 0) * 0.5
    : 0;

  function applyZoom(nextZoom: number) {
    const clamped = clampNationalMapZoom(nextZoom);
    const next = nationalMapViewBox(clamped, viewCenter(view));
    setZoom(clamped);
    setCenter(viewCenter(next));
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    // Evita caret de texto / selección al hacer clic o drag en el SVG.
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      regionId: regionIdFromTarget(event.target),
    };
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dxPx = event.clientX - drag.lastX;
    const dyPx = event.clientY - drag.lastY;
    if (!drag.moved) {
      if (
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8
      ) {
        return;
      }
      drag.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    const next = shiftNationalMapView(
      view,
      dxPx / Math.max(pxPerUnit, 0.01),
      dyPx / Math.max(pxPerUnit, 0.01),
    );
    setCenter(viewCenter(next));
  }

  function onPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldSelect = !drag.moved && drag.regionId != null;
    const regionId = drag.regionId;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      /* already released */
    }
    // Solo selecciona en clic corto; el drag no toca la región activa.
    if (shouldSelect && regionId != null) {
      onSelectRegion?.(regionId);
    }
  }

  function handleSelectRegion(id: number) {
    onSelectRegion?.(id);
  }

  const viewBox = `${view.minX} ${view.minY} ${view.width} ${view.height}`;

  return (
    <div
      data-testid="national-map-frame"
      className="relative flex h-full w-full flex-col overflow-visible rounded-2xl border border-slate-200 bg-transparent"
      role="group"
      aria-label="Mapa de Chile, norte arriba"
    >
      <button
        type="button"
        aria-label="Sede Online"
        aria-pressed={selectedOnline}
        data-testid="national-online-sede"
        className="group absolute left-6 top-7 z-20 inline-flex flex-col items-center gap-1"
        onClick={() => onSelectOnline?.()}
      >
        <Globe
          className={
            selectedOnline
              ? 'h-11 w-11 fill-emerald-500 stroke-emerald-600 transition-colors'
              : 'h-11 w-11 fill-[#e2e8f0] stroke-[#cbd5e1] transition-colors group-hover:fill-emerald-500 group-hover:stroke-emerald-600 group-focus-visible:fill-emerald-500 group-focus-visible:stroke-emerald-600'
          }
          strokeWidth={1.35}
          aria-hidden
        />
        <span
          className={
            selectedOnline
              ? 'text-center text-[11px] font-semibold leading-tight text-emerald-600 transition-colors'
              : 'text-center text-[11px] font-semibold leading-tight text-slate-500 transition-colors group-hover:text-emerald-600 group-focus-visible:text-emerald-600'
          }
        >
          <span className="block">Sede</span>
          <span className="block">Online</span>
        </span>
      </button>
      <div className="absolute inset-0 overflow-hidden rounded-2xl bg-white">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="national-map-svg h-full w-full cursor-grab bg-white active:cursor-grabbing"
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseDown={(event) => {
            // Chrome muestra caret al enfocar paths SVG; bloquea foco/selección.
            event.preventDefault();
          }}
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const delta =
              event.deltaY > 0
                ? -NATIONAL_MAP_ZOOM_STEP
                : NATIONAL_MAP_ZOOM_STEP;
            const nextZoom = clampNationalMapZoom(zoom + delta);
            if (nextZoom === zoom) return;
            const point = clientToMap(
              event.currentTarget,
              view,
              event.clientX,
              event.clientY,
            );
            const next = zoomNationalMapAt(view, nextZoom, point);
            setZoom(nextZoom);
            setCenter(viewCenter(next));
          }}
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
                  data-region-id={region.id}
                  className={
                    selected
                      ? 'chile-region-path chile-region-path-selected'
                      : 'chile-region-path'
                  }
                  onPointerEnter={() => setHoveredRegionId(region.id)}
                  onPointerLeave={() =>
                    setHoveredRegionId((current) =>
                      current === region.id ? null : current,
                    )
                  }
                  onFocus={() => setHoveredRegionId(region.id)}
                  onBlur={() =>
                    setHoveredRegionId((current) =>
                      current === region.id ? null : current,
                    )
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectRegion(region.id);
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
                fill="#475569"
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
      <svg
        viewBox={viewBox}
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {CHILE_REGION_PATHS.map((region) => {
          const box = chileRegionPathBBox(region.d, 0);
          const lines = regionHoverLines(region.name);
          const labelX = box.minX + box.width + 8;
          const labelY = box.minY + box.height / 2;
          const visible = hoveredRegionId === region.id;
          return (
            <text
              key={region.id}
              className={
                visible
                  ? 'chile-region-hover-label chile-region-hover-label-visible'
                  : 'chile-region-hover-label'
              }
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
          );
        })}
      </svg>
      <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label="Acercar mapa"
          disabled={zoom >= NATIONAL_MAP_ZOOM_MAX - 0.001}
          onClick={() => applyZoom(zoom + NATIONAL_MAP_ZOOM_STEP)}
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
        <div className="h-px bg-slate-200" />
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label="Alejar mapa"
          disabled={zoom <= NATIONAL_MAP_ZOOM_MIN + 0.001}
          onClick={() => applyZoom(zoom - NATIONAL_MAP_ZOOM_STEP)}
        >
          <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function regionIdFromTarget(target: EventTarget | null): number | null {
  if (!(target instanceof Element)) return null;
  const host = target.closest('[data-region-id]');
  const raw = host?.getAttribute('data-region-id');
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function clientToMap(
  svg: SVGSVGElement,
  view: { minX: number; minY: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const ctm = svg.getScreenCTM?.() ?? null;
  if (ctm) {
    try {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const mapped = point.matrixTransform(ctm.inverse());
      return { x: mapped.x, y: mapped.y };
    } catch {
      /* jsdom */
    }
  }
  const rect = svg.getBoundingClientRect();
  const scale = Math.min(
    (rect.width || 1) / view.width,
    (rect.height || 1) / view.height,
  );
  const originX = rect.left + (rect.width - view.width * scale) / 2;
  const originY = rect.top + (rect.height - view.height * scale) / 2;
  return {
    x: view.minX + (clientX - originX) / scale,
    y: view.minY + (clientY - originY) / scale,
  };
}
