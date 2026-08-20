'use client';

import * as React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';

export const MULTI_SELECT_SEP = '|';

/** Umbral a partir del cual se muestra el buscador en la lista. */
const SEARCH_THRESHOLD = 7;

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
  const [search, setSearch] = React.useState('');
  const selectedSet = React.useMemo(() => new Set(parseValues(value)), [value]);

  const showSearch = options.length > SEARCH_THRESHOLD;

  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search, showSearch]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const optionsListCleanup = React.useRef<(() => void) | null>(null);
  const setOptionsListRef = React.useCallback((node: HTMLDivElement | null) => {
    optionsListCleanup.current?.();
    optionsListCleanup.current = null;
    if (node) optionsListCleanup.current = containWheelScroll(node);
  }, []);

  React.useEffect(() => {
    return () => {
      optionsListCleanup.current?.();
      optionsListCleanup.current = null;
    };
  }, []);

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
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 px-2">Sin opciones</p>
        ) : (
          <>
            {showSearch && (
              <div className="border-b p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-8 pl-8 text-sm"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div
              ref={setOptionsListRef}
              className="max-h-[280px] overflow-y-auto overscroll-contain p-2 space-y-1"
            >
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 px-1">
                  Sin resultados
                </p>
              ) : (
                filteredOptions.map((opt) => {
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
                })
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
