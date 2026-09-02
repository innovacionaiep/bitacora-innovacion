'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Columns3, GraduationCap, Landmark, Mail, MapPin, PanelLeftClose, PanelLeftOpen, Search, Tag, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import {
  vitrinaAiFilterIsActive,
  vitrinaDiscoveryIsActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import { VITRINA_HERO } from '@/components/vitrina/vitrina-content';
import { cn } from '@/lib/utils';
import type { PortalAvancesColumnDef } from '@/lib/portal-avances-columns';

type Facet = keyof VitrinaProjectFilters;
type Tone = 'fondo' | 'sede' | 'escuela' | 'tag' | 'column';
type OpenPanel = Facet | 'columnas' | null;

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
  column: 'bg-violet-50 text-violet-800',
};

export function VitrinaProjectsSidebar({
  options,
  filters,
  query,
  matchIds,
  aiFilterActive,
  onToggle,
  onQueryChange,
  onClear,
  onBack,
  hiddenFacets = [],
  searchPlaceholder = 'Nombre, sede, etiqueta...',
  columnOptions,
  visibleColumns,
  onToggleColumn,
}: {
  options: VitrinaProjectFilters;
  filters: VitrinaProjectFilters;
  query: string;
  matchIds: string[] | null;
  aiFilterActive: boolean;
  onToggle: (facet: Facet, value: string) => void;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  onBack: () => void;
  hiddenFacets?: Facet[];
  searchPlaceholder?: string;
  columnOptions?: PortalAvancesColumnDef[];
  visibleColumns?: string[];
  onToggleColumn?: (columnId: string) => void;
}) {
  const columnsActive =
    Boolean(columnOptions?.length) &&
    Boolean(visibleColumns) &&
    visibleColumns!.length < columnOptions!.length;
  const active =
    vitrinaDiscoveryIsActive(filters, matchIds, query) || columnsActive;
  const showAiLabel = vitrinaAiFilterIsActive(aiFilterActive);
  const [openFacet, setOpenFacet] = useState<OpenPanel>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [searchUnlocked, setSearchUnlocked] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col bg-white shadow-[6px_0_18px_-8px_rgba(15,23,42,0.28)] transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-64',
      )}
      aria-label="Descubre proyectos"
      data-collapsed={collapsed ? 'true' : undefined}
    >
      <div className={cn('shrink-0 pt-6', collapsed ? 'px-2' : 'px-5')}>
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-800',
            collapsed && 'h-9 w-full justify-center',
          )}
          aria-label={collapsed ? 'Volver' : undefined}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {collapsed ? null : 'Volver'}
        </button>
      </div>
      {collapsed ? (
        <div className="min-h-0 flex-1" />
      ) : (
      <div
        id="vitrina-sidebar-filters"
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-8 pt-8"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Descubre proyectos
            </h2>
            {showAiLabel ? (
              <p className="mt-1 text-xs leading-snug text-violet-600">
                Filtro inteligente aplicado (IA)
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

      <section aria-labelledby="vitrina-filter-query">
        <div className="mb-2 flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <h3
            id="vitrina-filter-query"
            className="text-sm font-medium text-slate-800"
          >
            Buscar
          </h3>
        </div>
        <div className="relative">
          <Input
            name="vitrina-project-search"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore=""
            data-lpignore="true"
            readOnly={!searchUnlocked}
            onFocus={() => setSearchUnlocked(true)}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-slate-200 pr-8 text-sm shadow-none"
            aria-label="Buscar en todos los campos del proyecto"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute inset-y-0 right-1.5 inline-flex w-6 items-center justify-center text-slate-400 hover:text-slate-700"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </section>

      {FACETS.filter((facet) => !hiddenFacets.includes(facet.key)).map((facet) => {
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
      {columnOptions && columnOptions.length > 0 && onToggleColumn ? (
        <ColumnsDropdown
          options={columnOptions}
          visibleIds={visibleColumns ?? columnOptions.map((c) => c.id)}
          open={openFacet === 'columnas'}
          onOpenChange={(next) => setOpenFacet(next ? 'columnas' : null)}
          onToggle={onToggleColumn}
        />
      ) : null}
      </div>
      )}
      <div className={cn('shrink-0 pb-2', collapsed ? 'px-2' : 'px-5')}>
        <button
          type="button"
          onClick={() => {
            setCollapsed((current) => !current);
            setOpenFacet(null);
          }}
          aria-expanded={!collapsed}
          aria-controls="vitrina-sidebar-filters"
          aria-label={collapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800',
            collapsed ? 'w-full justify-center' : 'w-full px-1.5',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
              Ocultar filtros
            </>
          )}
        </button>
      </div>
      <div
        className={cn(
          'shrink-0 border-t border-slate-100',
          collapsed ? 'px-2 py-3' : 'px-5 pb-6 pt-4',
        )}
      >
        {collapsed ? null : (
          <>
            <p className="text-[10px] font-medium leading-snug text-slate-500">
              {VITRINA_HERO.kicker}
            </p>
            <a
              href="mailto:centroinnovacion@aiep.cl"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[11px] text-slate-400 hover:text-violet-600"
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">centroinnovacion@aiep.cl</span>
            </a>
          </>
        )}
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

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`vitrina-filter-list-${facet.key}`}
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className={selected.length === 0 ? 'truncate text-slate-400' : 'truncate'}>
              {selected.length === 0
                ? facet.placeholder
                : `${selected.length} seleccionada${selected.length === 1 ? '' : 's'}`}
            </span>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                open && 'translate-x-0.5',
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={`vitrina-filter-list-${facet.key}`}
          aria-labelledby={`vitrina-filter-${facet.key}`}
          side="right"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          className="w-64 rounded-md border-slate-200 bg-white p-0 shadow-md"
        >
          {showSearch ? (
            <div className="border-b border-slate-100 p-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                autoComplete="off"
                name={`vitrina-filter-search-${facet.key}`}
                data-1p-ignore=""
                data-lpignore="true"
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
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
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

function ColumnsDropdown({
  options,
  visibleIds,
  open,
  onOpenChange,
  onToggle,
}: {
  options: PortalAvancesColumnDef[];
  visibleIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (columnId: string) => void;
}) {
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

  const allVisible = visibleIds.length >= options.length;
  const hidden = options.filter((col) => !visibleIds.includes(col.id));

  return (
    <section aria-labelledby="vitrina-filter-columnas">
      <div className="mb-2 flex items-center gap-2">
        <Columns3 className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
        <h3
          id="vitrina-filter-columnas"
          className="text-sm font-medium text-slate-800"
        >
          Columnas
        </h3>
      </div>

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="vitrina-filter-list-columnas"
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className={allVisible ? 'truncate text-slate-400' : 'truncate'}>
              {allVisible
                ? 'Todas las columnas'
                : `${visibleIds.length} de ${options.length} visibles`}
            </span>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                open && 'translate-x-0.5',
              )}
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id="vitrina-filter-list-columnas"
          aria-labelledby="vitrina-filter-columnas"
          side="right"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          className="w-64 rounded-md border-slate-200 bg-white p-0 shadow-md"
        >
          <div ref={setListRef} className="max-h-64 overflow-y-auto p-1.5">
            {options.map((col) => {
              const checked = visibleIds.includes(col.id);
              return (
                <label
                  key={col.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(col.id)}
                    className="mt-0.5 border-slate-300 shadow-none"
                  />
                  <span className="leading-snug">{col.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {hidden.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {hidden.map((col) => (
            <li key={col.id}>
              <span
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium',
                  CHIP_CLASS.column,
                )}
              >
                <span className="truncate">{col.label}</span>
                <button
                  type="button"
                  onClick={() => onToggle(col.id)}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
                  aria-label={`Mostrar ${col.label}`}
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
