'use client';

import type { DistributionItem } from '@/app/dashboard/dashboard-metrics';
import { cn } from '@/lib/utils';

type DistributionListProps = {
  data: DistributionItem[];
  /** 'ofTotal' muestra N (x%) respecto al total de proyectos/participantes.
   *  'ofMax' normaliza la barra al valor máximo del set. */
  barMode?: 'ofTotal' | 'ofMax';
  emptyLabel?: string;
  className?: string;
  maxItems?: number;
};

export function DistributionList({
  data,
  barMode = 'ofTotal',
  emptyLabel = 'Sin datos',
  className,
  maxItems,
}: DistributionListProps) {
  const items = maxItems ? data.slice(0, maxItems) : data;

  if (!items.length) {
    return (
      <p className="text-[13px] text-gray-400 text-center py-8">{emptyLabel}</p>
    );
  }

  const maxValue = Math.max(...items.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => {
        const barWidth =
          barMode === 'ofMax'
            ? Math.min(100, (item.value / maxValue) * 100)
            : Math.min(100, item.percentOfTotal);

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-gray-700 truncate min-w-0">
                {item.label}
              </span>
              <span className="text-[12px] font-medium tabular-nums text-gray-800 shrink-0">
                {item.value}
                <span className="text-gray-400 font-normal">
                  {' '}
                  ({item.percentOfTotal}%)
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500/80 transition-all duration-500"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: item.color || undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
