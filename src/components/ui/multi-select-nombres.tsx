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

export type OptionNombre = { id: string; nombre: string };

/** Separador interno para valores múltiples (permite nombres con coma). */
export const MULTI_VALUE_SEP = ' | ';

function parseValue(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(MULTI_VALUE_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatValue(names: string[]): string {
  return names.join(MULTI_VALUE_SEP);
}

interface MultiSelectNombresProps {
  options: OptionNombre[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function MultiSelectNombres({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className,
  triggerClassName,
}: MultiSelectNombresProps) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(
    () => new Set(parseValue(value).map((n) => n.toLowerCase())),
    [value]
  );

  const toggle = (nombre: string) => {
    const current = parseValue(value);
    const lower = nombre.toLowerCase();
    const has = selectedSet.has(lower);
    const next = has
      ? current.filter((n) => n.toLowerCase() !== lower)
      : [...current, nombre];
    onChange(formatValue(next));
  };

  const displayLabel =
    selectedSet.size === 0 ? placeholder : parseValue(value).join(', ');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between border-2 border-gray-300 rounded-lg focus:border-blue-500 bg-white min-h-[52px] h-auto py-2 text-left',
            triggerClassName,
            className
          )}
        >
          <span className="line-clamp-2 text-left font-normal flex-1 min-w-0">
            {displayLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
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
              const checked = selectedSet.has(opt.nombre.toLowerCase());
              return (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(opt.nombre)}
                  />
                  <span className="text-sm">{opt.nombre}</span>
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
