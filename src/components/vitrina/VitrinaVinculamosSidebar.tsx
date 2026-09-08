'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Columns3,
  GraduationCap,
  Hash,
  Landmark,
  Mail,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Type,
  Users,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { VITRINA_HERO } from '@/components/vitrina/vitrina-content';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import {
  isVinculamosContainsFacet,
  vinculamosFiltersAreActive,
  type VinculamosContainsFacet,
  type VinculamosFilterFacet,
  type VinculamosFilters,
} from '@/lib/portal-vinculamos-filters';
import type {
  MideimpactoIniciativaColumn,
  MideimpactoIniciativaColumnKey,
} from '@/lib/mideimpacto-iniciativas';
import { cn } from '@/lib/utils';

type Tone =
  | 'id'
  | 'nombre'
  | 'estado'
  | 'fecha'
  | 'mecanismo'
  | 'sede'
  | 'escuela'
  | 'region'
  | 'comuna'
  | 'socio'
  | 'grupo'
  | 'tematica'
  | 'column';

const SEARCH_THRESHOLD = 7;

type OpenFacet = VinculamosFilterFacet | 'columnas';

const FACETS: {
  key: VinculamosFilterFacet;
  label: string;
  placeholder: string;
  tone: Tone;
  icon: typeof Hash;
  iconClass: string;
}[] = [
  {
    key: 'ids',
    label: 'ID',
    placeholder: 'Todos los ID',
    tone: 'id',
    icon: Hash,
    iconClass: 'text-slate-500',
  },
  {
    key: 'nombres',
    label: 'Nombre',
    placeholder: 'Escribe y pulsa Enter',
    tone: 'nombre',
    icon: Type,
    iconClass: 'text-violet-600',
  },
  {
    key: 'estados',
    label: 'Estado',
    placeholder: 'Todos los estados',
    tone: 'estado',
    icon: Tag,
    iconClass: 'text-emerald-600',
  },
  {
    key: 'fechas',
    label: 'Fecha',
    placeholder: 'Todas las fechas',
    tone: 'fecha',
    icon: Calendar,
    iconClass: 'text-blue-600',
  },
  {
    key: 'mecanismos',
    label: 'Mecanismo',
    placeholder: 'Todos los mecanismos',
    tone: 'mecanismo',
    icon: Landmark,
    iconClass: 'text-orange-600',
  },
  {
    key: 'sedes',
    label: 'Sede*',
    placeholder: 'Todas las sedes',
    tone: 'sede',
    icon: MapPin,
    iconClass: 'text-rose-600',
  },
  {
    key: 'escuelas',
    label: 'Escuela',
    placeholder: 'Todas las escuelas',
    tone: 'escuela',
    icon: GraduationCap,
    iconClass: 'text-indigo-600',
  },
  {
    key: 'regiones',
    label: 'Región',
    placeholder: 'Todas las regiones',
    tone: 'region',
    icon: MapPin,
    iconClass: 'text-teal-600',
  },
  {
    key: 'comunas',
    label: 'Comuna',
    placeholder: 'Todas las comunas',
    tone: 'comuna',
    icon: Building2,
    iconClass: 'text-cyan-700',
  },
  {
    key: 'socios',
    label: 'Socio Comunitario',
    placeholder: 'Escribe y pulsa Enter',
    tone: 'socio',
    icon: Users,
    iconClass: 'text-violet-600',
  },
  {
    key: 'gruposInteres',
    label: 'Grupos de Interés',
    placeholder: 'Todos los grupos',
    tone: 'grupo',
    icon: Users,
    iconClass: 'text-pink-600',
  },
  {
    key: 'tematicas',
    label: 'Temáticas',
    placeholder: 'Todas las temáticas',
    tone: 'tematica',
    icon: Tag,
    iconClass: 'text-amber-700',
  },
];

const CHIP_CLASS: Record<Tone, string> = {
  id: 'bg-slate-100 text-slate-700',
  nombre: 'bg-violet-50 text-violet-800',
  estado: 'bg-emerald-50 text-emerald-800',
  fecha: 'bg-blue-50 text-blue-800',
  mecanismo: 'bg-orange-50 text-orange-800',
  sede: 'bg-rose-50 text-rose-800',
  escuela: 'bg-indigo-50 text-indigo-800',
  region: 'bg-teal-50 text-teal-800',
  comuna: 'bg-cyan-50 text-cyan-800',
  socio: 'bg-violet-50 text-violet-800',
  grupo: 'bg-pink-50 text-pink-800',
  tematica: 'bg-amber-50 text-amber-900',
  column: 'bg-violet-50 text-violet-800',
};

export function VitrinaVinculamosSidebar({
  options,
  filters,
  onToggle,
  onAddContains,
  onClear,
  onBack,
  columnOptions,
  visibleColumns,
  onToggleColumn,
}: {
  options: VinculamosFilters;
  filters: VinculamosFilters;
  onToggle: (facet: VinculamosFilterFacet, value: string) => void;
  onAddContains: (facet: VinculamosContainsFacet, value: string) => void;
  onClear: () => void;
  onBack: () => void;
  columnOptions: readonly MideimpactoIniciativaColumn[];
  visibleColumns: MideimpactoIniciativaColumnKey[];
  onToggleColumn: (columnId: MideimpactoIniciativaColumnKey) => void;
}) {
  const filtersActive = vinculamosFiltersAreActive(filters);
  const [openFacet, setOpenFacet] = useState<OpenFacet | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col bg-white shadow-[6px_0_18px_-8px_rgba(15,23,42,0.28)] transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-64',
      )}
      aria-label="Filtros de iniciativas"
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
          id="vinculamos-sidebar-filters"
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-8 pt-8"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Descubre iniciativas
            </h2>
            {filtersActive ? (
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
          <ColumnsDropdown
            options={columnOptions}
            visibleIds={visibleColumns}
            open={openFacet === 'columnas'}
            onOpenChange={(next) => setOpenFacet(next ? 'columnas' : null)}
            onToggle={onToggleColumn}
          />
          {FACETS.map((facet) => {
            if (isVinculamosContainsFacet(facet.key)) {
              return (
                <ContainsFilter
                  key={facet.key}
                  facet={facet}
                  selected={filters[facet.key]}
                  onAdd={(value) => onAddContains(facet.key, value)}
                  onRemove={(value) => onToggle(facet.key, value)}
                />
              );
            }
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
      )}
      <div className={cn('shrink-0 pb-2', collapsed ? 'px-2' : 'px-5')}>
        <button
          type="button"
          onClick={() => {
            setCollapsed((current) => !current);
            setOpenFacet(null);
          }}
          aria-expanded={!collapsed}
          aria-controls="vinculamos-sidebar-filters"
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

function ColumnsDropdown({
  options,
  visibleIds,
  open,
  onOpenChange,
  onToggle,
}: {
  options: readonly MideimpactoIniciativaColumn[];
  visibleIds: MideimpactoIniciativaColumnKey[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (columnId: MideimpactoIniciativaColumnKey) => void;
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
  const hidden = options.filter((col) => !visibleIds.includes(col.key));

  return (
    <section aria-labelledby="vinculamos-filter-columnas">
      <div className="mb-2 flex items-center gap-2">
        <Columns3 className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
        <h3
          id="vinculamos-filter-columnas"
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
            aria-controls="vinculamos-filter-list-columnas"
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className={allVisible ? 'truncate text-slate-400' : 'truncate'}>
              {allVisible
                ? 'Todas las columnas'
                : `${visibleIds.length} de ${options.length} visibles`}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id="vinculamos-filter-list-columnas"
          aria-labelledby="vinculamos-filter-columnas"
          side="right"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          className="w-64 rounded-md border-slate-200 bg-white p-0 shadow-md"
        >
          <div ref={setListRef} className="max-h-64 overflow-y-auto p-1.5">
            {options.map((col) => {
              const checked = visibleIds.includes(col.key);
              return (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(col.key)}
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
            <li key={col.key}>
              <span
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium',
                  CHIP_CLASS.column,
                )}
              >
                <span className="truncate">{col.label}</span>
                <button
                  type="button"
                  onClick={() => onToggle(col.key)}
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

function ContainsFilter({
  facet,
  selected,
  onAdd,
  onRemove,
}: {
  facet: (typeof FACETS)[number];
  selected: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const Icon = facet.icon;

  const commit = () => {
    const term = draft.trim();
    if (!term) return;
    onAdd(term);
    setDraft('');
  };

  return (
    <section aria-labelledby={`vinculamos-filter-${facet.key}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${facet.iconClass}`} aria-hidden />
        <h3
          id={`vinculamos-filter-${facet.key}`}
          className="text-sm font-medium text-slate-800"
        >
          {facet.label}
        </h3>
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          commit();
        }}
        placeholder={facet.placeholder}
        autoComplete="off"
        aria-label={facet.label}
        className="h-9 border-slate-200 text-sm shadow-none"
      />
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
                  onClick={() => onRemove(value)}
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
    <section aria-labelledby={`vinculamos-filter-${facet.key}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${facet.iconClass}`} aria-hidden />
        <h3
          id={`vinculamos-filter-${facet.key}`}
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
            aria-controls={`vinculamos-filter-list-${facet.key}`}
            className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className={selected.length === 0 ? 'truncate text-slate-400' : 'truncate'}>
              {selected.length === 0
                ? facet.placeholder
                : `${selected.length} seleccionada${selected.length === 1 ? '' : 's'}`}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={`vinculamos-filter-list-${facet.key}`}
          aria-labelledby={`vinculamos-filter-${facet.key}`}
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
                className="h-8 border-slate-200 text-sm shadow-none"
              />
            </div>
          ) : null}
          <div ref={setListRef} className="max-h-48 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-slate-400">Sin resultados</p>
            ) : (
              filtered.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={selected.includes(value)}
                    onCheckedChange={() => onToggle(value)}
                    className="mt-0.5 border-slate-300 shadow-none"
                  />
                  <span className="leading-snug">{value}</span>
                </label>
              ))
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
