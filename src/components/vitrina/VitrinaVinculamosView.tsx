'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VitrinaVinculamosSidebar } from '@/components/vitrina/VitrinaVinculamosSidebar';
import { getMideimpactoIniciativas } from '@/lib/actions/mideimpacto-iniciativas';
import {
  INICIATIVA_COLUMN_ORDER,
  clampIniciativaColumnWidth,
  defaultIniciativaColumnWidths,
  iniciativaColumnWidthStyle,
  portalMideimpactoAdjuntoHref,
  type MideimpactoIniciativa,
  type MideimpactoIniciativaColumn,
  type MideimpactoIniciativaColumnKey,
  type MideimpactoIniciativasPage,
} from '@/lib/mideimpacto-iniciativas';
import {
  EMPTY_VINCULAMOS_FILTERS,
  filterVinculamosRows,
  toggleVinculamosFilter,
  uniqueVinculamosFilterOptions,
  type VinculamosFilters,
} from '@/lib/portal-vinculamos-filters';
import { cn } from '@/lib/utils';

function AdjuntosCell({ row }: { row: MideimpactoIniciativa }) {
  if (row.adjuntos.length === 0) return '—';
  return (
    <ul className="flex flex-col gap-1">
      {row.adjuntos.map((adjunto) => (
        <li key={adjunto.id}>
          <a
            href={portalMideimpactoAdjuntoHref(row.id, adjunto)}
            className="break-all text-emerald-700 underline-offset-2 hover:underline"
            title={adjunto.downloadUrl || adjunto.nombre}
          >
            {adjunto.nombre || adjunto.downloadUrl || 'Descargar'}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ResizableHead({
  col,
  style,
  onResizeStart,
}: {
  col: MideimpactoIniciativaColumn;
  style: CSSProperties;
  onResizeStart: (e: ReactMouseEvent) => void;
}) {
  return (
    <TableHead
      style={style}
      className="relative text-[12px] font-medium tracking-wide text-gray-500 uppercase"
    >
      <span className="block truncate pr-2">{col.label}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionar columna ${col.label}`}
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 z-40 h-full w-1.5 cursor-col-resize touch-none select-none after:absolute after:inset-y-1 after:right-0 after:w-px after:bg-gray-200 hover:after:bg-emerald-500 active:after:bg-emerald-600"
      />
    </TableHead>
  );
}

export function VitrinaVinculamosView({
  initial,
  onBack,
}: {
  initial: {
    success: boolean;
    data?: MideimpactoIniciativasPage;
    error?: string;
  };
  onBack: () => void;
}) {
  const [result, setResult] = useState(initial);
  const [filters, setFilters] = useState<VinculamosFilters>(EMPTY_VINCULAMOS_FILTERS);
  const [pending, startTransition] = useTransition();
  const [columnWidths, setColumnWidths] = useState(defaultIniciativaColumnWidths);
  const dragRef = useRef<{
    id: MideimpactoIniciativaColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    setResult(initial);
  }, [initial]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = clampIniciativaColumnWidth(
        drag.startWidth + (e.clientX - drag.startX),
      );
      setColumnWidths((prev) =>
        prev[drag.id] === next ? prev : { ...prev, [drag.id]: next },
      );
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
    };
  }, []);

  const startResize =
    (id: MideimpactoIniciativaColumnKey) => (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        id,
        startX: e.clientX,
        startWidth: columnWidths[id],
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

  const colStyle = (id: MideimpactoIniciativaColumnKey) =>
    iniciativaColumnWidthStyle(columnWidths[id]);

  const page = result.data;
  const rows = page?.rows ?? [];
  const filtered = useMemo(
    () => filterVinculamosRows(rows, filters),
    [rows, filters],
  );
  const options = useMemo(() => uniqueVinculamosFilterOptions(rows), [rows]);
  const columns = INICIATIVA_COLUMN_ORDER;
  const currentPage = page?.page ?? 1;
  const lastPage = page?.lastPage ?? 1;
  const error = result.success
    ? null
    : result.error ?? 'No se pudieron cargar las iniciativas';

  const goTo = (nextPage: number) => {
    startTransition(async () => {
      const next = await getMideimpactoIniciativas({ page: nextPage });
      setResult(next);
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full items-stretch bg-white">
      <VitrinaVinculamosSidebar
        options={options}
        filters={filters}
        onToggle={(facet, value) => {
          setFilters((current) => toggleVinculamosFilter(current, facet, value));
        }}
        onClear={() => setFilters(EMPTY_VINCULAMOS_FILTERS)}
        onBack={onBack}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4 lg:px-8">
          {error ? (
            <p className="text-sm text-slate-600" role="alert">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay iniciativas para mostrar.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay iniciativas que coincidan con los filtros.
            </p>
          ) : (
            <Table className="w-max min-w-full table-fixed border-separate border-spacing-0 [&_th]:border-b [&_td]:border-b text-[12px]">
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <ResizableHead
                      key={col.key}
                      col={col}
                      style={colStyle(col.key)}
                      onResizeStart={startResize(col.key)}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, index) => (
                  <TableRow key={row.id || `row-${index}`}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        style={colStyle(col.key)}
                        className={cn(
                          'align-top text-slate-800',
                          col.key === 'nombre' && 'font-medium',
                          col.key === 'adjuntos' && 'whitespace-normal break-words',
                        )}
                      >
                        {col.key === 'adjuntos'
                          ? <AdjuntosCell row={row} />
                          : row[col.key] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {!error ? (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 lg:px-8">
            <p className="text-xs text-slate-500">
              Página {currentPage} de {lastPage}
              {page?.total != null ? ` · ${page.total} iniciativas` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || currentPage <= 1}
                onClick={() => goTo(currentPage - 1)}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pending || currentPage >= lastPage}
                onClick={() => goTo(currentPage + 1)}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
