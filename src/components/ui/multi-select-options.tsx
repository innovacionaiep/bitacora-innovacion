'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

export const MULTI_SELECT_SEP = '|';

function parseValues(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(MULTI_SELECT_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatValues(values: string[]): string {
  return values.join(` ${MULTI_SELECT_SEP} `);
}

export type OptionItem = { value: string; label: string };

interface MultiSelectOptionsProps {
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function MultiSelectOptions({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className,
  triggerClassName,
}: MultiSelectOptionsProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(parseValues(value)), [value]);

  const toggle = (optionValue: string) => {
    const current = parseValues(value);
    const has = selectedSet.has(optionValue);
    const next = has
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    onChange(formatValues(next));
  };

  const displayLabel =
    selectedSet.size === 0
      ? placeholder
      : options
          .filter((o) => selectedSet.has(o.value))
          .map((o) => o.label)
          .join(', ');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between border border-gray-300 rounded-lg bg-white min-h-9',
            triggerClassName,
            className
          )}
        >
          <span className="truncate text-left font-normal text-sm">
            {displayLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-2 max-h-[280px] overflow-y-auto"
        align="start"
      >
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin opciones</p>
        ) : (
          <div className="space-y-1">
            {options.map((opt) => {
              const checked = selectedSet.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(opt.value)}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
