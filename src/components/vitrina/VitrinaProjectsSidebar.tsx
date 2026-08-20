'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, GraduationCap, Landmark, MapPin, Tag, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { VitrinaAiChat } from '@/components/vitrina/VitrinaAiChat';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import {
  vitrinaAiFilterIsActive,
  vitrinaDiscoveryIsActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import { cn } from '@/lib/utils';

type Facet = keyof VitrinaProjectFilters;
type Tone = 'fondo' | 'sede' | 'escuela' | 'tag';

const SEARCH_THRESHOLD = 7;

const FACETS: {
  key: Facet;
  label: string;
  placeholder: string;
  tone: Tone;
  icon: typeof MapPin;
  iconClass: string;
}[] = [
  {
    key: 'fondos',
    label: 'Fondo',
    placeholder: 'Todos los fondos',
    tone: 'fondo',
    icon: Landmark,
    iconClass: 'text-orange-600',
  },
  {
    key: 'sedes',
    label: 'Sede',
    placeholder: 'Todas las sedes',
    tone: 'sede',
    icon: MapPin,
    iconClass: 'text-slate-500',
  },
  {
    key: 'escuelas',
    label: 'Escuela',
    placeholder: 'Todas las escuelas',
    tone: 'escuela',
    icon: GraduationCap,
    iconClass: 'text-blue-600',
  },
  {
    key: 'etiquetas',
    label: 'Etiqueta',
    placeholder: 'Todas las etiquetas',
    tone: 'tag',
    icon: Tag,
    iconClass: 'text-emerald-600',
  },
];

const CHIP_CLASS: Record<Tone, string> = {
  fondo: 'bg-orange-50 text-orange-800',
  sede: 'bg-slate-100 text-slate-700',
  escuela: 'bg-blue-50 text-blue-800',
  tag: 'bg-emerald-50 text-emerald-800',
};

export function VitrinaProjectsSidebar({
  options,
  filters,
  matchIds,
  aiConfigured,
  aiFilterActive,
  onToggle,
  onClear,
  onAiResult,
}: {
  options: VitrinaProjectFilters;
  filters: VitrinaProjectFilters;
  matchIds: string[] | null;
  aiConfigured: boolean;
  aiFilterActive: boolean;
  onToggle: (facet: Facet, value: string) => void;
  onClear: () => void;
  onAiResult: (filters: VitrinaProjectFilters, matchIds: string[] | null) => void;
}) {
  const active = vitrinaDiscoveryIsActive(filters, matchIds);
  const showAiLabel = vitrinaAiFilterIsActive(aiFilterActive);
  const [openFacet, setOpenFacet] = useState<Facet | null>(null);

  return (
    <aside
      className="flex h-full min-h-0 w-64 shrink-0 flex-col bg-white shadow-[6px_0_18px_-8px_rgba(15,23,42,0.28)]"
      aria-label="Descubre proyectos"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Descubre proyectos
            </h2>
            {showAiLabel ? (
              <p className="mt-1 text-xs leading-snug text-violet-600">
                Filtro inteligente aplicado (I.A)
              </p>
            ) : null}
          </div>
          {active ? (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpenFacet(null);
              }}
              className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Limpiar
            </button>
          ) : null}
        </div>

      {FACETS.map((facet) => {
        const values = options[facet.key];
        if (values.length === 0) return null;
        return (
          <FilterDropdown
            key={facet.key}
            facet={facet}
            options={values}
            selected={filters[facet.key]}
            open={openFacet === facet.key}
            onOpenChange={(next) => setOpenFacet(next ? facet.key : null)}
            onToggle={(value) => onToggle(facet.key, value)}
          />
        );
      })}
      </div>

      <div className="flex h-[42%] min-h-[14rem] shrink-0 flex-col">
        <VitrinaAiChat configured={aiConfigured} onResult={onAiResult} />
      </div>
    </aside>
  );
}

function FilterDropdown({
  facet,
  options,
  selected,
  open,
  onOpenChange,
  onToggle,
}: {
  facet: (typeof FACETS)[number];
  options: string[];
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const Icon = facet.icon;
  const showSearch = options.length > SEARCH_THRESHOLD;

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!showSearch || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((value) => value.toLowerCase().includes(q));
  }, [options, search, showSearch]);

  const listCleanup = useRef<(() => void) | null>(null);
  const setListRef = useCallback((node: HTMLDivElement | null) => {
    listCleanup.current?.();
    listCleanup.current = null;
    if (node) listCleanup.current = containWheelScroll(node);
  }, []);

  useEffect(() => {
    return () => {
      listCleanup.current?.();
      listCleanup.current = null;
    };
  }, []);

  return (
    <section aria-labelledby={`vitrina-filter-${facet.key}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${facet.iconClass}`} aria-hidden />
        <h3
          id={`vitrina-filter-${facet.key}`}
          className="text-sm font-medium text-slate-800"
        >
          {facet.label}
        </h3>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={`vitrina-filter-list-${facet.key}`}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span className={selected.length === 0 ? 'truncate text-slate-400' : 'truncate'}>
          {selected.length === 0
            ? facet.placeholder
            : `${selected.length} seleccionada${selected.length === 1 ? '' : 's'}`}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={`vitrina-filter-list-${facet.key}`}
          className="mt-1 rounded-md border border-slate-200 bg-white"
        >
          {showSearch ? (
            <div className="border-b border-slate-100 p-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="h-8 border-slate-200 text-sm shadow-none"
              />
            </div>
          ) : null}
          <div ref={setListRef} className="max-h-48 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-slate-400">Sin resultados</p>
            ) : (
              filtered.map((value) => {
                const checked = selected.includes(value);
                return (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(value)}
                      className="mt-0.5 border-slate-300 shadow-none"
                    />
                    <span className="leading-snug">{value}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : selected.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <li key={value}>
              <span
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium',
                  CHIP_CLASS[facet.tone],
                )}
              >
                <span className="truncate">{value}</span>
                <button
                  type="button"
                  onClick={() => onToggle(value)}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
                  aria-label={`Quitar ${value}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
