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
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-8 py-10 lg:px-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(16rem,0.9fr)_1.2fr_1.2fr]">
        <article className="flex min-h-[18rem] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Proyectos
          </p>
          <p className="text-7xl font-bold tracking-tight text-slate-900 tabular-nums">
            {stats.total}
          </p>
          <p className="text-sm text-slate-500">
            {stats.total === 1
              ? 'proyecto en vitrina'
              : 'proyectos en vitrina'}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-700">
        {title}
      </h2>
      {children}
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
      <p className="flex h-56 items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-56 items-stretch gap-3 overflow-x-auto px-1">
      {data.map((item) => {
        const pct = Math.max(8, (item.value / max) * 100);
        return (
          <div
            key={item.label}
            className="flex w-16 min-w-16 shrink-0 flex-col"
            title={`${item.label}: ${item.value}`}
          >
            <span className="mb-1 text-center text-xs font-semibold tabular-nums text-slate-700">
              {item.value}
            </span>
            <div className="relative h-40 w-full">
              <div
                className={cn(
                  'absolute bottom-0 left-1/2 w-9 -translate-x-1/2 rounded-t-md',
                  colorFor(item.label),
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="mt-2 truncate text-center text-[11px] leading-tight text-slate-600">
              {item.label}
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
      <p className="flex h-56 items-center justify-center text-sm text-slate-400">
        No hay datos
      </p>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
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
