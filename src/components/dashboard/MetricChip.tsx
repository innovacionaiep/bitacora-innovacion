'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricChipProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
};

export function MetricChip({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: MetricChipProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-none',
        className
      )}
    >
      {Icon ? (
        <Icon
          className="h-4 w-4 shrink-0 text-gray-400"
          strokeWidth={1.75}
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-[12px] font-medium tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-[18px] font-semibold tabular-nums text-gray-800 leading-tight">
          {value}
        </p>
        {hint ? (
          <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
