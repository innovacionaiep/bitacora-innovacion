'use client';

import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import {
  FolderKanban,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { VitrinaChartProjectTooltip } from '@/components/vitrina/VitrinaChartProjectTooltip';
import { sumVitrinaAvancesParticipantes } from '@/lib/vitrina-avances-participantes';
import {
  portalAvancesFondosForLevel,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';
import type { PortalGuestLevel, PortalGuestProfile } from '@/lib/portal-guest-access';
import { buildVitrinaDataStats, countVitrinaSociosComunitarios, type VitrinaDataBarDatum, type VitrinaLineaFondoCatalog } from '@/lib/vitrina-data-stats';
import {
  vitrinaAsignaturaStripeClass,
  vitrinaCarreraStripeClass,
  vitrinaEscuelaStripeClass,
  vitrinaEtiquetaStripeClass,
  vitrinaFondoStripePaint,
  vitrinaLineaBarStripePaint,
  vitrinaSedeStripeClass,
  type VitrinaStripePaint,
} from '@/lib/vitrina-fondo-style';
import { useVitrinaFondoColors } from '@/components/vitrina/VitrinaFondoColorsContext';
import {
  buildVitrinaAvancesAsignaturaCobertura,
  buildVitrinaAvancesAsignaturaStats,
  buildVitrinaAvancesCarreraStats,
  type VitrinaAvancesAsignaturaCobertura,
} from '@/lib/vitrina-avances-dimension-stats';
import { donutSlicePath } from '@/lib/vitrina-donut-path';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { cn } from '@/lib/utils';

type ChartHover = {
  x: number;
  y: number;
  label: string;
  nombres: string[];
};

function formatCount(value: number): string {
  return value === 1 ? '1 proyecto' : `${value} proyectos`;
}

function formatCoveragePct(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text}%`;
}

function hoverFromEvent(
  event: MouseEvent<HTMLElement>,
  item: VitrinaDataBarDatum,
): ChartHover {
  return {
    x: event.clientX,
    y: event.clientY,
    label: item.label,
    nombres: item.nombres,
  };
}

export function VitrinaDataDashboard({
  proyectos,
  avancesProyectos = [],
  accessLevel = null,
  accessProfile = null,
  lineaCatalog,
  fondosFiltro = [],
}: {
  proyectos: VitrinaProyecto[];
  avancesProyectos?: PortalAvancesProyecto[];
  accessLevel?: PortalGuestLevel | null;
  accessProfile?: PortalGuestProfile | null;
  lineaCatalog?: VitrinaLineaFondoCatalog;
  fondosFiltro?: string[];
}) {
  const fondoColors = useVitrinaFondoColors();
  const stats = useMemo(
    () => buildVitrinaDataStats(proyectos, lineaCatalog),
    [proyectos, lineaCatalog],
  );
  const sociosComunitarios = useMemo(
    () => countVitrinaSociosComunitarios(proyectos),
    [proyectos],
  );
  const participantes = useMemo(
    () =>
      sumVitrinaAvancesParticipantes(
        avancesProyectos,
        portalAvancesFondosForLevel(accessLevel, accessProfile),
        fondosFiltro,
      ),
    [avancesProyectos, accessLevel, accessProfile, fondosFiltro],
  );
  const porCarrera = useMemo(
    () =>
      buildVitrinaAvancesCarreraStats(
        avancesProyectos,
        portalAvancesFondosForLevel(accessLevel, accessProfile),
        fondosFiltro,
      ),
    [avancesProyectos, accessLevel, accessProfile, fondosFiltro],
  );
  const porAsignatura = useMemo(
    () =>
      buildVitrinaAvancesAsignaturaStats(
        avancesProyectos,
        portalAvancesFondosForLevel(accessLevel, accessProfile),
        fondosFiltro,
      ),
    [avancesProyectos, accessLevel, accessProfile, fondosFiltro],
  );
  const coberturaAsignatura = useMemo(
    () =>
      buildVitrinaAvancesAsignaturaCobertura(
        avancesProyectos,
        portalAvancesFondosForLevel(accessLevel, accessProfile),
        fondosFiltro,
      ),
    [avancesProyectos, accessLevel, accessProfile, fondosFiltro],
  );
  const [hover, setHover] = useState<ChartHover | null>(null);

  const barHoverProps = (item: VitrinaDataBarDatum) => ({
    'aria-label': `${item.label}: ${formatCount(item.value)}`,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      setHover(hoverFromEvent(event, item));
    },
    onMouseMove: (event: MouseEvent<HTMLElement>) => {
      setHover(hoverFromEvent(event, item));
    },
    onMouseLeave: () => setHover(null),
  });

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col gap-6 overflow-y-auto px-6 py-6 overscroll-contain lg:overflow-hidden lg:px-8">
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-1 gap-6 lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,2.2fr)_minmax(12rem,0.75fr)]">
        <article
          data-resumen-kpis
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <ul className="flex min-h-0 flex-[0.7] flex-col">
            <ResumenPersonaRow
              label="Proyectos"
              value={stats.total}
              icon={FolderKanban}
              valueClass="text-4xl"
              emphasis
            />
          </ul>

          <div className="my-3 border-t border-slate-200" role="separator" />

          <ul className="flex min-h-0 flex-1 flex-col">
            <ResumenPersonaRow
              compact
              label="Estudiantes"
              value={participantes.estudiantes}
              icon={GraduationCap}
            />
            <ResumenPersonaRow
              compact
              label="Docentes"
              value={participantes.docentes}
              icon={Presentation}
            />
          </ul>

          <div className="my-3 border-t border-slate-200" role="separator" />

          <ul className="flex min-h-0 flex-1 flex-col">
            <ResumenPersonaRow
              compact
              label="Socios comunitarios"
              value={sociosComunitarios}
              icon={Handshake}
            />
            <ResumenPersonaRow
              compact
              label="Beneficiarios"
              value={participantes.beneficiarios}
              icon={HeartHandshake}
            />
          </ul>
        </article>

        <article
          data-fondo-linea-stack
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-slate-700">
            Por fondo
          </h2>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
            <VitrinaVerticalBars
              data={stats.porFondo}
              colorFor={(item) => vitrinaFondoStripePaint(item.label, fondoColors)}
              barHoverProps={barHoverProps}
            />
          </div>

          <div className="my-3 border-t border-slate-200" role="separator" />

          <h2 className="mb-2 shrink-0 text-sm font-semibold tracking-wide text-slate-700">
            Por línea
          </h2>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
            <VitrinaVerticalBars
              data={stats.porLinea}
              colorFor={(item) =>
                vitrinaLineaBarStripePaint(item.label, item.parentFondo, fondoColors)
              }
              barHoverProps={barHoverProps}
            />
          </div>
        </article>

        <ChartCard title="Asignatura">
          <VitrinaAsignaturaPie
            cobertura={coberturaAsignatura}
            onHover={setHover}
          />
        </ChartCard>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-[minmax(0,1fr)] grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <ChartCard title="Por sede">
          <VitrinaRowBars
            data={stats.porSede}
            colorFor={(item) => vitrinaSedeStripeClass(item.label)}
            barHoverProps={barHoverProps}
          />
        </ChartCard>
        <ChartCard title="Por escuela">
          <VitrinaRowBars
            data={stats.porEscuela}
            colorFor={(item) => vitrinaEscuelaStripeClass(item.label)}
            barHoverProps={barHoverProps}
          />
        </ChartCard>
        <ChartCard title="Por carrera">
          <VitrinaRowBars
            data={porCarrera}
            colorFor={(item) => vitrinaCarreraStripeClass(item.label)}
            barHoverProps={barHoverProps}
          />
        </ChartCard>
        <ChartCard title="Por asignatura">
          <VitrinaRowBars
            data={porAsignatura}
            colorFor={(item) => vitrinaAsignaturaStripeClass(item.label)}
            barHoverProps={barHoverProps}
          />
        </ChartCard>
        <ChartCard title="Por etiqueta">
          <VitrinaRowBars
            data={stats.porEtiqueta}
            colorFor={(item) => vitrinaEtiquetaStripeClass(item.label)}
            barHoverProps={barHoverProps}
          />
        </ChartCard>
      </div>

      {hover ? (
        <VitrinaChartProjectTooltip
          title={hover.label}
          nombres={hover.nombres}
          x={hover.x}
          y={hover.y}
        />
      ) : null}
    </div>
  );
}

/** Primera palabra en la línea 1; el resto, en una sola segunda línea. */
export function formatVerticalBarLabel(label: string) {
  const trimmed = label.trim().replace(/\s+/g, ' ');
  const space = trimmed.indexOf(' ');
  if (space === -1) return trimmed;
  return `${trimmed.slice(0, space)}\n${trimmed.slice(space + 1)}`;
}

function ResumenPersonaRow({
  label,
  value,
  icon: Icon,
  valueClass = 'text-2xl',
  compact = false,
  emphasis = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  valueClass?: string;
  compact?: boolean;
  emphasis?: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 px-1',
        compact ? 'min-h-0 flex-1 py-1' : 'min-h-0 flex-1 py-2',
      )}
      aria-label={`${label}: ${value}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon
          className={cn(
            'shrink-0 text-slate-500',
            emphasis ? 'h-9 w-9' : 'h-6 w-6',
          )}
          aria-hidden
        />
        <span
          className={cn(
            'truncate font-medium text-slate-600',
            emphasis ? 'text-2xl font-semibold text-slate-700' : 'text-sm',
          )}
        >
          {label}
        </span>
      </span>
      <span
        className={cn(
          'font-bold tracking-tight text-slate-900 tabular-nums',
          valueClass,
        )}
      >
        {value}
      </span>
    </li>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 shrink-0 text-sm font-semibold tracking-wide text-slate-700">
        {title}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </article>
  );
}

type BarHoverProps = (item: VitrinaDataBarDatum) => {
  'aria-label': string;
  onMouseEnter: (event: MouseEvent<HTMLElement>) => void;
  onMouseMove: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
};

type BarColor = string | VitrinaStripePaint;

function resolveBarColor(color: BarColor): VitrinaStripePaint {
  if (typeof color === 'string') return { className: color };
  return color;
}

function VitrinaVerticalBars({
  data,
  colorFor,
  barHoverProps,
}: {
  data: VitrinaDataBarDatum[];
  colorFor: (item: VitrinaDataBarDatum) => BarColor;
  barHoverProps: BarHoverProps;
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[8rem] items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-full min-h-0 items-end gap-3 overflow-x-auto px-1">
      {data.map((item) => {
        const pct = Math.max(8, (item.value / max) * 100);
        const paint = resolveBarColor(colorFor(item));
        return (
          <div
            key={item.label}
            className="flex h-full min-h-0 w-[5.5rem] min-w-[5.5rem] shrink-0 cursor-pointer flex-col"
            {...barHoverProps(item)}
          >
            <div className="flex min-h-0 w-full flex-1 flex-col items-center">
              <div
                className="min-h-0 w-full"
                style={{ flexGrow: 100 - pct, flexBasis: 0 }}
                aria-hidden
              />
              <span className="mb-1.5 shrink-0 text-xs font-semibold leading-none tabular-nums text-slate-700">
                {item.value}
              </span>
              <div
                className={cn('w-9 min-h-2 shrink-0 rounded-t-md', paint.className)}
                style={{
                  flexGrow: pct,
                  flexBasis: 0,
                  ...paint.style,
                }}
              />
            </div>
            <span className="mt-1.5 block h-[2.5em] shrink-0 whitespace-pre text-center text-[11px] leading-tight text-slate-600">
              {formatVerticalBarLabel(item.label)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const ASIGNATURA_PIE_CON = '#2563eb';
const ASIGNATURA_PIE_SIN = '#cbd5e1';

function VitrinaAsignaturaPie({
  cobertura,
  onHover,
}: {
  cobertura: VitrinaAvancesAsignaturaCobertura;
  onHover: (hover: ChartHover | null) => void;
}) {
  if (cobertura.total === 0) {
    return (
      <p className="flex h-full min-h-[8rem] items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 78;
  const rInner = 46;
  const slices = [
    {
      key: 'con',
      label: 'Con asignatura',
      pct: cobertura.conPct,
      color: ASIGNATURA_PIE_CON,
      nombres: cobertura.nombresCon,
      startPct: 0,
      endPct: cobertura.conPct,
    },
    {
      key: 'sin',
      label: 'Sin asignatura',
      pct: cobertura.sinPct,
      color: ASIGNATURA_PIE_SIN,
      nombres: cobertura.nombresSin,
      startPct: cobertura.conPct,
      endPct: 100,
    },
  ];

  return (
    <div
      data-asignatura-pie
      className="flex h-full min-h-0 flex-col justify-end"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Con asignatura ${formatCoveragePct(cobertura.conPct)}, sin asignatura ${formatCoveragePct(cobertura.sinPct)}`}
        >
          {slices.map((slice) => {
            const d = donutSlicePath(
              cx,
              cy,
              rOuter,
              rInner,
              slice.startPct,
              slice.endPct,
            );
            if (!d) return null;
            return (
              <path
                key={slice.key}
                d={d}
                suppressHydrationWarning
                fill={slice.color}
                fillRule="evenodd"
                className="cursor-pointer"
                aria-label={`${slice.label}: ${formatCoveragePct(slice.pct)}`}
                onMouseEnter={(event) => {
                  onHover({
                    x: event.clientX,
                    y: event.clientY,
                    label: slice.label,
                    nombres: slice.nombres,
                  });
                }}
                onMouseMove={(event) => {
                  onHover({
                    x: event.clientX,
                    y: event.clientY,
                    label: slice.label,
                    nombres: slice.nombres,
                  });
                }}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
        </svg>
      </div>
      <ul className="mt-1.5 w-full shrink-0 space-y-1 text-[11px] leading-tight text-slate-600">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-800">
              {formatCoveragePct(slice.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VitrinaRowBars({
  data,
  colorFor,
  barHoverProps,
}: {
  data: VitrinaDataBarDatum[];
  colorFor: (item: VitrinaDataBarDatum) => string;
  barHoverProps: BarHoverProps;
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[8rem] items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3 pr-1">
      {data.map((item) => {
        const pct = Math.max(6, (item.value / max) * 100);
        return (
          <div
            key={item.label}
            className="cursor-pointer"
            {...barHoverProps(item)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium text-slate-700">
                {item.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', colorFor(item))}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
