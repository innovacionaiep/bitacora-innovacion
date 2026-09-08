'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
  concatIniciativaPages,
  defaultIniciativaColumnWidths,
  iniciativaColumnWidthStyle,
  stackedSubcolumnCell,
  isPreguntaChipColumn,
  type MideimpactoIniciativa,
  type MideimpactoIniciativaColumn,
  type MideimpactoIniciativaColumnKey,
  type MideimpactoIniciativasPage,
} from '@/lib/mideimpacto-iniciativas';
import {
  EMPTY_VINCULAMOS_FILTERS,
  defaultVinculamosVisibleColumns,
  filterVinculamosRows,
  toggleVinculamosColumn,
  toggleVinculamosFilter,
  addVinculamosContainsTerm,
  uniqueVinculamosFilterOptions,
  type VinculamosFilters,
} from '@/lib/portal-vinculamos-filters';
import { cn } from '@/lib/utils';

function PreguntaChips({
  values,
  label,
}: {
  values: string[];
  label: string;
}) {
  if (values.length === 0) return '—';
  return (
    <ul
      className="flex flex-wrap gap-1"
      aria-label={label}
    >
      {values.map((value, index) => (
        <li key={`${value}-${index}`}>
          <span className="inline-block max-w-full break-words rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {value}
          </span>
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
      className="sticky top-0 z-20 bg-white text-[12px] font-medium tracking-wide text-gray-500 uppercase"
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

const PAGE_RETRY_MS = 800;
const PAGE_RETRY_LIMIT = 3;

function formatVinculamosCount(value: number): string {
  return new Intl.NumberFormat('es-CL').format(value);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
  const [rows, setRows] = useState<MideimpactoIniciativa[]>(
    initial.data?.rows ?? [],
  );
  const [lastPage, setLastPage] = useState(initial.data?.lastPage ?? 1);
  const [total, setTotal] = useState<number | null>(initial.data?.total ?? null);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VinculamosFilters>(EMPTY_VINCULAMOS_FILTERS);
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVinculamosVisibleColumns,
  );
  const [columnWidths, setColumnWidths] = useState(defaultIniciativaColumnWidths);
  const dragRef = useRef<{
    id: MideimpactoIniciativaColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    setRows(initial.data?.rows ?? []);
    setLastPage(initial.data?.lastPage ?? 1);
    setTotal(initial.data?.total ?? null);
    setLoadError(null);
    setLoadingPage(null);
  }, [initial]);

  useEffect(() => {
    if (!initial.success || !initial.data) return;
    const startPage = initial.data.page;
    let targetLast = initial.data.lastPage;
    if (targetLast <= startPage) return;
    let cancelled = false;
    let accumulated = initial.data.rows;

    async function loadRest() {
      for (let pageNum = startPage + 1; pageNum <= targetLast; pageNum += 1) {
        if (cancelled) return;
        setLoadingPage(pageNum);
        let fetched = false;
        for (let attempt = 1; attempt <= PAGE_RETRY_LIMIT; attempt += 1) {
          if (cancelled) return;
          const next = await getMideimpactoIniciativas({ page: pageNum });
          if (cancelled) return;
          if (next.success && next.data) {
            accumulated = concatIniciativaPages(accumulated, next.data.rows);
            setRows(accumulated);
            if (next.data.total != null) setTotal(next.data.total);
            if (next.data.lastPage > targetLast) {
              targetLast = next.data.lastPage;
              setLastPage(targetLast);
            }
            fetched = true;
            break;
          }
          const limited = (next.error ?? '').toLowerCase().includes('límite');
          if (!limited || attempt === PAGE_RETRY_LIMIT) {
            setLoadError(
              next.error ?? 'No se pudieron cargar el resto de las páginas',
            );
            setLoadingPage(null);
            return;
          }
          await sleep(PAGE_RETRY_MS);
        }
        if (!fetched) {
          setLoadingPage(null);
          return;
        }
      }
      if (!cancelled) setLoadingPage(null);
    }

    void loadRest();
    return () => {
      cancelled = true;
    };
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

  const filtered = useMemo(
    () => filterVinculamosRows(rows, filters),
    [rows, filters],
  );
  const options = useMemo(() => uniqueVinculamosFilterOptions(rows), [rows]);
  const columns = useMemo(
    () =>
      INICIATIVA_COLUMN_ORDER.filter((col) => visibleColumns.includes(col.key)),
    [visibleColumns],
  );
  const error = initial.success
    ? null
    : initial.error ?? 'No se pudieron cargar las iniciativas';

  return (
    <div className="flex h-full min-h-0 w-full items-stretch bg-white">
      <VitrinaVinculamosSidebar
        options={options}
        filters={filters}
        onToggle={(facet, value) => {
          setFilters((current) => toggleVinculamosFilter(current, facet, value));
        }}
        onAddContains={(facet, value) => {
          setFilters((current) => addVinculamosContainsTerm(current, facet, value));
        }}
        onClear={() => setFilters(EMPTY_VINCULAMOS_FILTERS)}
        onBack={onBack}
        columnOptions={INICIATIVA_COLUMN_ORDER}
        visibleColumns={visibleColumns}
        onToggleColumn={(columnId) => {
          setVisibleColumns((current) =>
            toggleVinculamosColumn(current, columnId),
          );
        }}
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
                          'align-top break-words text-slate-800',
                          isPreguntaChipColumn(col.key)
                            ? 'whitespace-normal'
                            : 'whitespace-pre-line',
                          col.key === 'nombre' && 'font-medium',
                        )}
                      >
                        {isPreguntaChipColumn(col.key) ? (
                          <PreguntaChips
                            values={row[col.key]}
                            label={col.label}
                          />
                        ) : (
                          stackedSubcolumnCell(row, col.key)
                        )}
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
              {formatVinculamosCount(rows.length)}
              {total != null
                ? ` / ${formatVinculamosCount(total)} iniciativas`
                : ' iniciativas'}
            </p>
            {loadingPage != null ? (
              <p className="text-xs text-slate-500">
                Cargando página {loadingPage} de {lastPage}…
              </p>
            ) : loadError ? (
              <p className="text-xs text-amber-700" role="status">
                {loadError}
              </p>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
