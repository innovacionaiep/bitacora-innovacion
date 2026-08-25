'use client';

import { useMemo, useState } from 'react';
import {
  buildVitrinaTrlSankey,
  layoutVitrinaTrlSankey,
  type VitrinaTrlTarget,
} from '@/lib/vitrina-trl-sankey';
import {
  buildVitrinaIgipScatter,
  formatIgip,
  formatIgipDelta,
  layoutVitrinaIgipScatter,
  type VitrinaIgipSortBy,
  type VitrinaIgipTarget,
} from '@/lib/vitrina-igip-scatter';
import {
  buildVitrinaIgipSankey,
  formatIgipBin,
  layoutVitrinaIgipSankey,
} from '@/lib/vitrina-igip-sankey';
import {
  buildVitrinaTrlDumbbell,
  formatTrlDelta,
  layoutVitrinaTrlDumbbell,
  type VitrinaTrlSortBy,
} from '@/lib/vitrina-trl-dumbbell';
import {
  AMBOS_LABEL_GAP,
  buildVitrinaAmbosScatter,
  layoutVitrinaAmbosLabels,
  layoutVitrinaAmbosScatter,
} from '@/lib/vitrina-ambos-scatter';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

type IndicatorKind = 'igip' | 'trl' | 'ambos';
type IndicatorTarget = VitrinaTrlTarget & VitrinaIgipTarget;
type ChartType = 'dumbbell' | 'sankey';

const SVG_W = 960;
const SVG_H = 520;
const NAME_COL = 'w-[15.6rem]';
const DELTA_COL = 'w-20 pr-3';

const LEVEL_COLORS = [
  '#94a3b8',
  '#64748b',
  '#0ea5e9',
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#e11d48',
  '#ea580c',
  '#16a34a',
] as const;

function colorForTrl(level: number): string {
  if (level >= 1 && level <= 9) return LEVEL_COLORS[level - 1];
  return '#475569';
}

function colorForIgipBin(start: number): string {
  const idx = Math.round(start / 0.25);
  return LEVEL_COLORS[((idx % 9) + 9) % 9];
}

function formatCount(value: number): string {
  return value === 1 ? '1 proyecto' : `${value} proyectos`;
}

export function VitrinaIndicadoresDashboard({
  proyectos,
}: {
  proyectos: VitrinaProyecto[];
}) {
  const [kind, setKind] = useState<IndicatorKind>('trl');
  const [target, setTarget] = useState<IndicatorTarget>('proyeccion');
  const [chartType, setChartType] = useState<ChartType>('sankey');

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-4 px-8 py-6 lg:px-12">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <PillTabs
          label="Familia de indicadores"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setTarget('proyeccion');
            if (next === 'igip') setChartType('dumbbell');
            if (next === 'trl') setChartType('sankey');
          }}
          options={[
            { value: 'igip', label: 'IGIP' },
            { value: 'trl', label: 'TRL' },
            { value: 'ambos', label: 'Ambos' },
          ]}
        />
        {kind === 'trl' ? (
          <PillTabs
            label="Destino TRL"
            value={target}
            onChange={setTarget}
            options={[
              { value: 'proyeccion', label: 'TRL Proyección' },
              { value: 'final', label: 'TRL Final' },
            ]}
          />
        ) : kind === 'igip' ? (
          <PillTabs
            label="Destino IGIP"
            value={target}
            onChange={setTarget}
            options={[
              { value: 'proyeccion', label: 'IGIP Proyección' },
              { value: 'final', label: 'IGIP Final' },
            ]}
          />
        ) : (
          <PillTabs
            label="Destino indicadores"
            value={target}
            onChange={setTarget}
            options={[
              { value: 'proyeccion', label: 'Proyección' },
              { value: 'final', label: 'Final' },
            ]}
          />
        )}
        {kind !== 'ambos' ? (
          <div className="ml-auto">
            <PillTabs
              label="Tipo de gráfico"
              value={chartType}
              onChange={setChartType}
              options={[
                { value: 'dumbbell', label: 'Dumbbell' },
                { value: 'sankey', label: 'Sankey' },
              ]}
            />
          </div>
        ) : null}
      </div>

      {kind === 'ambos' ? (
        <AmbosScatterCard proyectos={proyectos} target={target} />
      ) : kind === 'igip' ? (
        chartType === 'dumbbell' ? (
          <IgipDumbbellCard proyectos={proyectos} target={target} />
        ) : (
          <IgipSankeyCard proyectos={proyectos} target={target} />
        )
      ) : chartType === 'dumbbell' ? (
        <TrlDumbbellCard proyectos={proyectos} target={target} />
      ) : (
        <TrlSankeyCard proyectos={proyectos} target={target} />
      )}
    </div>
  );
}

function AmbosScatterCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaIgipTarget;
}) {
  const destinationName = target === 'proyeccion' ? 'Proyección' : 'Final';
  const scatter = useMemo(
    () => buildVitrinaAmbosScatter(proyectos, target),
    [proyectos, target],
  );
  const layout = useMemo(
    () => layoutVitrinaAmbosScatter(scatter, { width: SVG_W, height: SVG_H }),
    [scatter],
  );
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [hover, setHover] = useState<null | {
    x: number;
    y: number;
    proyectoId: string;
    nombre: string;
    kind: 'inicial' | 'destino';
    trl: number;
    igip: number;
  }>(null);

  const xFor = (trl: number) => {
    const span = layout.xMax - layout.xMin || 1;
    return layout.plot.left + ((trl - layout.xMin) / span) * layout.plot.width;
  };
  const yFor = (igip: number) => {
    const span = layout.yMax - layout.yMin || 1;
    return (
      layout.plot.top +
      layout.plot.height -
      ((igip - layout.yMin) / span) * layout.plot.height
    );
  };

  const allLinks = useMemo(() => {
    const byProject = new Map<
      string,
      {
        nombre: string;
        from?: (typeof layout.points)[number];
        to?: (typeof layout.points)[number];
      }
    >();
    for (const point of layout.points) {
      const current = byProject.get(point.proyectoId) ?? {
        nombre: point.nombre,
      };
      if (point.kind === 'inicial') current.from = point;
      else current.to = point;
      byProject.set(point.proyectoId, current);
    }
    return [...byProject.entries()]
      .filter(([, pair]) => pair.from && pair.to)
      .map(([proyectoId, pair]) => ({
        proyectoId,
        nombre: pair.nombre,
        from: pair.from!,
        to: pair.to!,
      }));
  }, [layout.points]);

  const nameLabels = useMemo(() => {
    if (!showNames) return [];
    const anchors = layout.points
      .filter((point) => point.kind === 'destino')
      .map((point) => ({
        id: point.proyectoId,
        nombre: point.nombre,
        x: xFor(point.trl) - AMBOS_LABEL_GAP,
        y: yFor(point.igip),
      }));
    return layoutVitrinaAmbosLabels(anchors, layout.plot);
  }, [showNames, layout.points, layout.plot, layout.xMin, layout.xMax, layout.yMin, layout.yMax]);

  const hoverLink = useMemo(() => {
    if (!hover || showAllLinks) return null;
    return (
      allLinks.find((link) => link.proyectoId === hover.proyectoId) ?? null
    );
  }, [hover, showAllLinks, allLinks]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {scatter.included > 0 ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-3 text-[11px] text-slate-500">
          <button
            type="button"
            aria-pressed={showAllLinks}
            onClick={() => setShowAllLinks((prev) => !prev)}
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors',
              showAllLinks
                ? 'border-slate-300 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {showAllLinks ? 'Ocultar trayectorias' : 'Mostrar trayectorias'}
          </button>
          <button
            type="button"
            aria-pressed={showNames}
            onClick={() => setShowNames((prev) => !prev)}
            className={cn(
              'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium transition-colors',
              showNames
                ? 'border-slate-300 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {showNames ? 'Ocultar nombres' : 'Mostrar nombres'}
          </button>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Inicial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {destinationName}
          </span>
        </div>
      ) : null}
      <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {scatter.included === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
            No hay proyectos con TRL e IGIP para Inicial o {destinationName}.
          </p>
        ) : (
          <div className="relative min-h-0 flex-1">
            <svg
              aria-label={`Scatter TRL e IGIP desde Inicial hacia ${destinationName}`}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {layout.xTicks.map((tick) => (
                <g key={`x-${tick}`}>
                  <line
                    x1={xFor(tick)}
                    y1={layout.plot.top}
                    x2={xFor(tick)}
                    y2={layout.plot.top + layout.plot.height}
                    className="stroke-slate-100"
                  />
                  <text
                    x={xFor(tick)}
                    y={layout.plot.top + layout.plot.height + 18}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px]"
                  >
                    {tick}
                  </text>
                </g>
              ))}
              {layout.yTicks.map((tick) => (
                <g key={`y-${tick}`}>
                  <line
                    x1={layout.plot.left}
                    y1={yFor(tick)}
                    x2={layout.plot.left + layout.plot.width}
                    y2={yFor(tick)}
                    className="stroke-slate-100"
                  />
                  <text
                    x={layout.plot.left - 8}
                    y={yFor(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-slate-500 text-[11px]"
                  >
                    {formatIgip(tick)}
                  </text>
                </g>
              ))}
              <text
                x={layout.plot.left + layout.plot.width / 2}
                y={SVG_H - 4}
                textAnchor="middle"
                className="fill-slate-600 text-[12px] font-semibold"
              >
                TRL
              </text>
              <text
                x={16}
                y={layout.plot.top + layout.plot.height / 2}
                textAnchor="middle"
                className="fill-slate-600 text-[12px] font-semibold"
                transform={`rotate(-90 16 ${layout.plot.top + layout.plot.height / 2})`}
              >
                IGIP
              </text>
              {showAllLinks
                ? allLinks.map((link) => (
                    <line
                      key={`link-${link.proyectoId}`}
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke="#94a3b8"
                      strokeWidth={1.25}
                      strokeOpacity={0.65}
                      strokeDasharray="4 3"
                      aria-label={`Trayectoria ${link.nombre}: Inicial → ${destinationName}`}
                    />
                  ))
                : null}
              {hoverLink ? (
                <line
                  x1={hoverLink.from.x}
                  y1={hoverLink.from.y}
                  x2={hoverLink.to.x}
                  y2={hoverLink.to.y}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  strokeDasharray="4 3"
                  aria-label={`Trayectoria ${hoverLink.from.nombre}: Inicial → ${destinationName}`}
                />
              ) : null}
              {showNames
                ? nameLabels.map((item) => (
                    <text
                      key={`name-${item.id}`}
                      x={item.x}
                      y={item.y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-slate-600 text-[8px] font-medium"
                      style={{
                        paintOrder: 'stroke',
                        stroke: 'white',
                        strokeWidth: 2.5,
                      }}
                    >
                      {item.label}
                    </text>
                  ))
                : null}
              {layout.points.map((point) => (
                <circle
                  key={point.id}
                  cx={point.x}
                  cy={point.y}
                  r={6}
                  className="cursor-pointer stroke-white stroke-2"
                  fill={point.kind === 'inicial' ? '#64748b' : '#10b981'}
                  opacity={
                    !showAllLinks &&
                    hover &&
                    hover.proyectoId !== point.proyectoId
                      ? 0.35
                      : 1
                  }
                  aria-label={`${point.kind === 'inicial' ? 'Inicial' : destinationName} ${point.nombre}: TRL ${point.trl}, IGIP ${formatIgip(point.igip)}`}
                  onMouseEnter={(event) => {
                    const box = event.currentTarget.ownerSVGElement
                      ?.parentElement
                      ?.getBoundingClientRect();
                    if (!box) return;
                    setHover({
                      x: event.clientX - box.left + 14,
                      y: event.clientY - box.top + 14,
                      proyectoId: point.proyectoId,
                      nombre: point.nombre,
                      kind: point.kind,
                      trl: point.trl,
                      igip: point.igip,
                    });
                  }}
                  onMouseMove={(event) => {
                    const box = event.currentTarget.ownerSVGElement
                      ?.parentElement
                      ?.getBoundingClientRect();
                    if (!box) return;
                    setHover({
                      x: event.clientX - box.left + 14,
                      y: event.clientY - box.top + 14,
                      proyectoId: point.proyectoId,
                      nombre: point.nombre,
                      kind: point.kind,
                      trl: point.trl,
                      igip: point.igip,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </svg>
            {hover ? (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
                style={{ left: hover.x, top: hover.y }}
              >
                <p className="text-xs font-semibold text-slate-800">
                  {hover.nombre}
                </p>
                <p className="text-[11px] text-slate-500">
                  {hover.kind === 'inicial' ? 'Inicial' : destinationName}
                  {' · '}TRL {hover.trl}
                  {' · '}IGIP {formatIgip(hover.igip)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </article>
    </div>
  );
}

function IgipDumbbellCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaIgipTarget;
}) {
  const targetLabel =
    target === 'proyeccion' ? 'IGIP Proyección' : 'IGIP Final';
  const destinationName = targetLabel.replace('IGIP ', '');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<VitrinaIgipSortBy>('variacion');
  const scatter = useMemo(
    () => buildVitrinaIgipScatter(proyectos, target, sortBy),
    [proyectos, target, sortBy],
  );
  const layout = useMemo(
    () => layoutVitrinaIgipScatter(scatter, { width: 100 }),
    [scatter],
  );

  const pct = (value: number) => {
    const span = layout.max - layout.min || 1;
    return ((value - layout.min) / span) * 100;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {scatter.included > 0 ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Ordenar por:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Ordenar por"
                  className="inline-flex h-7 w-[9.5rem] items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="truncate">
                    {sortBy === 'nombre'
                      ? 'Nombre'
                      : sortBy === 'inicial'
                        ? 'IGIP Inicial'
                        : sortBy === 'destino'
                          ? targetLabel
                          : 'Variación'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[9.5rem]">
                <DropdownMenuItem onClick={() => setSortBy('nombre')}>
                  Nombre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('inicial')}>
                  IGIP Inicial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('destino')}>
                  {targetLabel}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('variacion')}>
                  Variación
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Inicial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {destinationName}
          </span>
        </div>
      ) : null}
      <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {scatter.included === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
            No hay proyectos con IGIP Inicial y {targetLabel}.
          </p>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col"
            aria-label={`Avance IGIP desde Inicial hacia ${targetLabel}`}
          >
            <DumbbellAxisHeader
              ticks={layout.ticks}
              pct={pct}
              formatTick={formatIgip}
            />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {layout.points.map((point) => (
                <DumbbellRow
                  key={point.id}
                  id={point.id}
                  nombre={point.nombre}
                  from={point.from}
                  to={point.to}
                  hovered={hoveredId === point.id}
                  onHover={setHoveredId}
                  pct={pct}
                  ticks={layout.ticks}
                  formatValue={formatIgip}
                  formatDelta={formatIgipDelta}
                  ariaPrefix="IGIP"
                />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

function TrlDumbbellCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaTrlTarget;
}) {
  const targetLabel =
    target === 'proyeccion' ? 'TRL Proyección' : 'TRL Final';
  const destinationName = targetLabel.replace('TRL ', '');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<VitrinaTrlSortBy>('variacion');
  const dumbbell = useMemo(
    () => buildVitrinaTrlDumbbell(proyectos, target, sortBy),
    [proyectos, target, sortBy],
  );
  const layout = useMemo(
    () => layoutVitrinaTrlDumbbell(dumbbell, { width: 100 }),
    [dumbbell],
  );

  const pct = (value: number) => {
    const span = layout.max - layout.min || 1;
    return ((value - layout.min) / span) * 100;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {dumbbell.included > 0 ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-end gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">Ordenar por:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Ordenar por"
                  className="inline-flex h-7 w-[9.5rem] items-center justify-between rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="truncate">
                    {sortBy === 'nombre'
                      ? 'Nombre'
                      : sortBy === 'inicial'
                        ? 'TRL Inicial'
                        : sortBy === 'destino'
                          ? targetLabel
                          : 'Variación'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[9.5rem]">
                <DropdownMenuItem onClick={() => setSortBy('nombre')}>
                  Nombre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('inicial')}>
                  TRL Inicial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('destino')}>
                  {targetLabel}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('variacion')}>
                  Variación
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            Inicial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {destinationName}
          </span>
        </div>
      ) : null}
      <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {dumbbell.included === 0 ? (
          <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
            No hay proyectos con TRL Inicial y {targetLabel}.
          </p>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col"
            aria-label={`Avance TRL desde Inicial hacia ${targetLabel}`}
          >
            <DumbbellAxisHeader
              ticks={layout.ticks}
              pct={pct}
              formatTick={(tick) => String(tick)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {layout.points.map((point) => (
                <DumbbellRow
                  key={point.id}
                  id={point.id}
                  nombre={point.nombre}
                  from={point.from}
                  to={point.to}
                  hovered={hoveredId === point.id}
                  onHover={setHoveredId}
                  pct={pct}
                  ticks={layout.ticks}
                  formatValue={(value) => String(value)}
                  formatDelta={formatTrlDelta}
                  ariaPrefix="TRL"
                />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

function DumbbellAxisHeader({
  ticks,
  pct,
  formatTick,
}: {
  ticks: number[];
  pct: (value: number) => number;
  formatTick: (tick: number) => string;
}) {
  return (
    <div className="mb-1 flex shrink-0 items-center gap-3 px-1">
      <p
        className={cn(
          NAME_COL,
          'flex h-7 shrink-0 items-center rounded-md bg-slate-200 px-3 text-xs font-semibold text-slate-700',
        )}
      >
        Nombre Proyecto
      </p>
      <div className="min-w-0 flex-1 rounded-md bg-slate-200 px-3">
        <div className="relative h-7">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tabular-nums text-slate-600"
              style={{ left: `${pct(tick)}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>
      </div>
      <p
        className={cn(
          DELTA_COL,
          'flex h-7 shrink-0 items-center justify-end rounded-md bg-slate-200 px-2 text-xs font-semibold text-slate-700',
        )}
      >
        Variación
      </p>
    </div>
  );
}

function DumbbellRow({
  id,
  nombre,
  from,
  to,
  hovered,
  onHover,
  pct,
  ticks,
  formatValue,
  formatDelta,
  ariaPrefix,
}: {
  id: string;
  nombre: string;
  from: number;
  to: number;
  hovered: boolean;
  onHover: (id: string | null) => void;
  pct: (value: number) => number;
  ticks: number[];
  formatValue: (value: number) => string;
  formatDelta: (from: number, to: number) => string;
  ariaPrefix: string;
}) {
  const left = Math.min(pct(from), pct(to));
  const width = Math.abs(pct(to) - pct(from));
  const rose = to < from;
  return (
    <div
      role="img"
      aria-label={`${ariaPrefix} ${formatValue(from)} → ${formatValue(to)}: ${nombre}`}
      className="flex items-center gap-3 px-1 py-1"
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={cn(NAME_COL, 'shrink-0')}>
        <p className="truncate text-xs font-medium text-slate-800">{nombre}</p>
      </div>
      <div className="min-w-0 flex-1 px-3">
        <div className="relative h-9">
          {ticks.map((tick) => (
            <span
              key={`${id}-${tick}`}
              className="absolute top-0 h-full w-px bg-slate-100"
              style={{ left: `${pct(tick)}%` }}
            />
          ))}
          <span
            className={cn(
              'absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full',
              rose ? 'bg-rose-300' : 'bg-emerald-200',
            )}
            style={{
              left: `${left}%`,
              width: `${Math.max(width, 0.6)}%`,
            }}
          />
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct(from)}%` }}
          >
            {hovered ? (
              <span className="absolute right-full top-1/2 z-10 mr-1 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-slate-700">
                {formatValue(from)}
              </span>
            ) : null}
            <span className="block h-3 w-3 rounded-full border-2 border-white bg-slate-500 shadow-sm" />
          </span>
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct(to)}%` }}
          >
            {hovered ? (
              <span
                className={cn(
                  'absolute left-full top-1/2 z-10 ml-1 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums',
                  rose ? 'text-rose-700' : 'text-emerald-700',
                )}
              >
                {formatValue(to)}
              </span>
            ) : null}
            <span
              className={cn(
                'block h-3 w-3 rounded-full border-2 border-white shadow-sm',
                rose ? 'bg-rose-500' : 'bg-emerald-500',
              )}
            />
          </span>
        </div>
      </div>
      <p
        className={cn(
          DELTA_COL,
          'shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600',
        )}
      >
        {formatDelta(from, to)}
      </p>
    </div>
  );
}

function ProjectNameList({ nombres }: { nombres: string[] }) {
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

function TrlSankeyCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaTrlTarget;
}) {
  const sankey = useMemo(
    () => buildVitrinaTrlSankey(proyectos, target),
    [proyectos, target],
  );
  const layout = useMemo(
    () => layoutVitrinaTrlSankey(sankey, { width: SVG_W, height: SVG_H }),
    [sankey],
  );
  const targetLabel =
    target === 'proyeccion' ? 'TRL Proyección' : 'TRL Final';

  return (
    <SankeyChart
      included={sankey.included}
      emptyMessage={`No hay proyectos con TRL Inicial y ${targetLabel}.`}
      ariaLabel={`Sankey TRL desde Inicial hacia ${targetLabel}`}
      fromTitle="TRL Inicial"
      toTitle={targetLabel}
      layout={layout}
      gradientIdPrefix={`trl-link-${target}`}
      formatLevel={(level) => `TRL ${level}`}
      colorForLevel={colorForTrl}
    />
  );
}

function IgipSankeyCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaIgipTarget;
}) {
  const sankey = useMemo(
    () => buildVitrinaIgipSankey(proyectos, target),
    [proyectos, target],
  );
  const layout = useMemo(
    () => layoutVitrinaIgipSankey(sankey, { width: SVG_W, height: SVG_H }),
    [sankey],
  );
  const targetLabel =
    target === 'proyeccion' ? 'IGIP Proyección' : 'IGIP Final';

  return (
    <SankeyChart
      included={sankey.included}
      emptyMessage={`No hay proyectos con IGIP Inicial y ${targetLabel}.`}
      ariaLabel={`Sankey IGIP desde Inicial hacia ${targetLabel}`}
      fromTitle="IGIP Inicial"
      toTitle={targetLabel}
      layout={layout}
      gradientIdPrefix={`igip-link-${target}`}
      formatLevel={formatIgipBin}
      colorForLevel={colorForIgipBin}
    />
  );
}

function SankeyChart({
  included,
  emptyMessage,
  ariaLabel,
  fromTitle,
  toTitle,
  layout,
  gradientIdPrefix,
  formatLevel,
  colorForLevel,
}: {
  included: number;
  emptyMessage: string;
  ariaLabel: string;
  fromTitle: string;
  toTitle: string;
  layout: ReturnType<typeof layoutVitrinaTrlSankey>;
  gradientIdPrefix: string;
  formatLevel: (level: number) => string;
  colorForLevel: (level: number) => string;
}) {
  const [hover, setHover] = useState<null | {
    x: number;
    y: number;
    from: number;
    to: number;
    nombres: string[];
  }>(null);

  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {included === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="relative min-h-0 flex-1">
          <svg
            aria-label={ariaLabel}
            viewBox={`0 0 ${SVG_W} ${SVG_H + 28}`}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <text
              x={layout.fromNodes[0]?.x ?? 88}
              y={12}
              className="fill-slate-500 text-[11px] font-semibold"
            >
              {fromTitle}
            </text>
            <text
              x={(layout.toNodes[0]?.x ?? SVG_W - 106) + 18}
              y={12}
              textAnchor="end"
              className="fill-slate-500 text-[11px] font-semibold"
            >
              {toTitle}
            </text>
            <g transform="translate(0 20)">
              <defs>
                {layout.links.map((link) => (
                  <linearGradient
                    key={`g-${link.from}-${link.to}`}
                    id={`${gradientIdPrefix}-${link.from}-${link.to}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={colorForLevel(link.from)}
                      stopOpacity="0.45"
                    />
                    <stop
                      offset="100%"
                      stopColor={colorForLevel(link.to)}
                      stopOpacity="0.55"
                    />
                  </linearGradient>
                ))}
              </defs>
              {layout.links.map((link) => (
                <path
                  key={`${link.from}-${link.to}`}
                  d={link.d}
                  fill={`url(#${gradientIdPrefix}-${link.from}-${link.to})`}
                  className={cn(
                    'cursor-pointer transition-opacity',
                    hover &&
                      (hover.from !== link.from || hover.to !== link.to) &&
                      'opacity-35',
                  )}
                  opacity={
                    hover && hover.from === link.from && hover.to === link.to
                      ? 1
                      : 0.85
                  }
                  aria-label={`${formatLevel(link.from)} → ${formatLevel(link.to)}: ${formatCount(link.value)}`}
                  onMouseEnter={(event) => {
                    const box = event.currentTarget.ownerSVGElement
                      ?.parentElement
                      ?.getBoundingClientRect();
                    if (!box) return;
                    setHover({
                      x: event.clientX - box.left + 14,
                      y: event.clientY - box.top + 14,
                      from: link.from,
                      to: link.to,
                      nombres: link.nombres,
                    });
                  }}
                  onMouseMove={(event) => {
                    const box = event.currentTarget.ownerSVGElement
                      ?.parentElement
                      ?.getBoundingClientRect();
                    if (!box) return;
                    setHover({
                      x: event.clientX - box.left + 14,
                      y: event.clientY - box.top + 14,
                      from: link.from,
                      to: link.to,
                      nombres: link.nombres,
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              {layout.fromNodes.map((node) => (
                <SankeyNode
                  key={`from-${node.level}`}
                  node={node}
                  align="left"
                  formatLevel={formatLevel}
                  colorForLevel={colorForLevel}
                />
              ))}
              {layout.toNodes.map((node) => (
                <SankeyNode
                  key={`to-${node.level}`}
                  node={node}
                  align="right"
                  formatLevel={formatLevel}
                  colorForLevel={colorForLevel}
                />
              ))}
            </g>
          </svg>
          {hover ? (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 max-h-64 max-w-xs overflow-y-auto rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg"
              style={{ left: hover.x, top: hover.y }}
            >
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
                {formatLevel(hover.from)} → {formatLevel(hover.to)}
              </p>
              <ProjectNameList nombres={hover.nombres} />
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

function SankeyNode({
  node,
  align,
  formatLevel,
  colorForLevel,
}: {
  node: {
    level: number;
    value: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  align: 'left' | 'right';
  formatLevel: (level: number) => string;
  colorForLevel: (level: number) => string;
}) {
  const label = formatLevel(node.level);
  const labelX = align === 'left' ? node.x - 10 : node.x + node.width + 10;
  const anchor = align === 'left' ? 'end' : 'start';
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={4}
        fill={colorForLevel(node.level)}
      >
        <title>{`${label}: ${formatCount(node.value)}`}</title>
      </rect>
      <text
        x={labelX}
        y={node.y + node.height / 2}
        textAnchor={anchor}
        dominantBaseline="middle"
        className="fill-slate-700 text-[12px] font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

function PillTabs<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-1 text-sm font-semibold transition-colors',
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
