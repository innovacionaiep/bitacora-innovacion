'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { format, differenceInDays, addDays, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeSliderProps {
  minDate: Date;
  maxDate: Date;
  startDate?: string;
  endDate?: string;
  onRangeChange?: (startDate: string, endDate: string) => void;
  className?: string;
  disabled?: boolean;
}

function parseDateStr(str: string | undefined, fallback: Date): Date {
  if (!str) return fallback;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + 'T12:00:00');
    const sep = str.includes('/') ? '/' : '-';
    const fmt = sep === '/' ? 'dd/MM/yyyy' : 'dd-MM-yyyy';
    return parse(str, fmt, new Date());
  } catch {
    return fallback;
  }
}

function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DateRangeSlider({
  minDate,
  maxDate,
  startDate,
  endDate,
  onRangeChange,
  className,
  disabled = false,
}: DateRangeSliderProps) {
  const totalDays = Math.max(1, differenceInDays(maxDate, minDate) + 1);

  const dateToValue = React.useCallback(
    (d: Date): number => {
      const days = differenceInDays(d, minDate);
      return Math.max(0, Math.min(100, (days / totalDays) * 100));
    },
    [minDate, totalDays]
  );

  const valueToDate = React.useCallback(
    (v: number): Date => {
      const days = (v / 100) * totalDays;
      return addDays(minDate, Math.round(days));
    },
    [minDate, totalDays]
  );

  const [values, setValues] = React.useState<[number, number]>(() => {
    const start = parseDateStr(startDate, minDate);
    const end = parseDateStr(endDate, maxDate);
    const startVal = (differenceInDays(start, minDate) / totalDays) * 100;
    const endVal = (differenceInDays(end, minDate) / totalDays) * 100;
    return [
      Math.max(0, Math.min(100, startVal)),
      Math.max(0, Math.min(100, endVal)),
    ];
  });

  const handleValueChange = (newValues: number[]) => {
    if (newValues.length < 2) return;
    const [startVal, endVal] = newValues;
    setValues([startVal, endVal]);
  };

  const handleValueCommit = (newValues: number[]) => {
    if (newValues.length < 2) return;
    const [startVal, endVal] = newValues;
    const start = valueToDate(startVal);
    const end = valueToDate(endVal);
    onRangeChange?.(toISODate(start), toISODate(end));
  };

  const formatLabel = (d: Date) =>
    format(d, "d MMM yyyy", { locale: es });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatLabel(valueToDate(values[0]))}</span>
        <span>{formatLabel(valueToDate(values[1]))}</span>
      </div>
      <SliderPrimitive.Root
        min={0}
        max={100}
        step={0.5}
        value={values}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        disabled={disabled}
        className="relative flex w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-emerald-500" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-emerald-600 bg-white shadow-md hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-grab active:cursor-grabbing" />
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-emerald-600 bg-white shadow-md hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>
    </div>
  );
}
