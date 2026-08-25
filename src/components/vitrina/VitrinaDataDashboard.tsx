'use client';

import { useMemo, type ReactNode } from 'react';
import { buildVitrinaDataStats, type VitrinaDataBarDatum } from '@/lib/vitrina-data-stats';
import {
  vitrinaEscuelaStripeClass,
  vitrinaEtiquetaStripeClass,
  vitrinaFondoStripeClass,
  vitrinaLineaStripeClass,
  vitrinaSedeStripeClass,
} from '@/lib/vitrina-fondo-style';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { cn } from '@/lib/utils';

export function VitrinaDataDashboard({
  proyectos,
}: {
  proyectos: VitrinaProyecto[];
}) {
  const stats = useMemo(() => buildVitrinaDataStats(proyectos), [proyectos]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-6 overflow-y-auto px-8 py-6 overscroll-contain lg:overflow-hidden lg:px-12">
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(16rem,1fr)] grid-cols-1 gap-6 lg:grid-cols-[minmax(16rem,0.9fr)_1.2fr_1.2fr]">
        <article className="flex h-full min-h-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Proyectos
          </p>
          <p className="text-7xl font-bold tracking-tight text-slate-900 tabular-nums">
            {stats.total}
          </p>
        </article>

        <ChartCard title="Por fondo">
          <VitrinaVerticalBars
            data={stats.porFondo}
            colorFor={vitrinaFondoStripeClass}
          />
        </ChartCard>

        <ChartCard title="Por línea">
          <VitrinaVerticalBars
            data={stats.porLinea}
            colorFor={vitrinaLineaStripeClass}
          />
        </ChartCard>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-[minmax(16rem,1fr)] grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Por sede">
          <VitrinaRowBars
            data={stats.porSede}
            colorFor={vitrinaSedeStripeClass}
          />
        </ChartCard>
        <ChartCard title="Por escuela">
          <VitrinaRowBars
            data={stats.porEscuela}
            colorFor={vitrinaEscuelaStripeClass}
          />
        </ChartCard>
        <ChartCard title="Por etiqueta">
          <VitrinaRowBars
            data={stats.porEtiqueta}
            colorFor={vitrinaEtiquetaStripeClass}
          />
        </ChartCard>
      </div>
    </div>
  );
}

/** Parte el nombre en líneas en cada espacio (p. ej. "Fondo Impulsa" → dos líneas). */
function formatVerticalBarLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed.includes(' ')) return trimmed;
  return trimmed.replace(/\s+/g, '\n');
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

function VitrinaVerticalBars({
  data,
  colorFor,
}: {
  data: VitrinaDataBarDatum[];
  colorFor: (label: string) => string;
}) {
  if (data.length === 0) {
    return (
      <p className="flex h-full min-h-[8rem] items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);
  /** Altura útil de la barra (deja sitio fijo al número encima). */
  const barMaxPx = 148;

  return (
    <div className="flex h-full min-h-0 items-end gap-3 overflow-x-auto px-1">
      {data.map((item) => {
        const pct = Math.max(8, (item.value / max) * 100);
        return (
          <div
            key={item.label}
            className="flex w-16 min-w-16 shrink-0 flex-col"
            title={`${item.label}: ${item.value}`}
          >
            <div
              className="flex w-full flex-col items-center justify-end"
              style={{ height: barMaxPx + 20 }}
            >
              <span className="mb-1.5 text-xs font-semibold leading-none tabular-nums text-slate-700">
                {item.value}
              </span>
              <div
                className={cn(
                  'w-9 shrink-0 rounded-t-md',
                  colorFor(item.label),
                )}
                style={{ height: `${(barMaxPx * pct) / 100}px` }}
              />
            </div>
            <span className="mt-1.5 whitespace-pre-line text-center text-[11px] leading-tight text-slate-600">
              {formatVerticalBarLabel(item.label)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VitrinaRowBars({
  data,
  colorFor,
}: {
  data: VitrinaDataBarDatum[];
  colorFor: (label: string) => string;
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
          <div key={item.label} title={`${item.label}: ${item.value}`}>
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
                className={cn('h-full rounded-full', colorFor(item.label))}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
