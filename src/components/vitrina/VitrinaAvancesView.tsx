'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatPresupuestoMonto } from '@/lib/utils/presupuesto-calculos';
import {
  PORTAL_AVANCES_FONDOS,
  formatPortalAvancesEscuelas,
  portalAvancesIsExcelFondo,
  type PortalAvancesFondo,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';
import {
  clampPortalAvancesColumnWidth,
  defaultPortalAvancesColumnWidths,
  defaultPortalAvancesVisibleColumns,
  portalAvancesColumnWidthStyle,
  type PortalAvancesColumnId,
} from '@/lib/portal-avances-columns';
import {
  clampPct,
  nextPortalAvancesSort,
  sortPortalAvancesProyectos,
  type PortalAvancesSort,
  type PortalAvancesSortKey,
} from '@/lib/portal-avances-table';

function PctBarCell({
  value,
  barClass,
}: {
  value: number;
  barClass: string;
}) {
  const v = clampPct(value);
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-700">
        {v}%
      </span>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
  style,
  align = 'left',
  onResizeStart,
}: {
  label: string;
  sortKey: PortalAvancesSortKey;
  sort: PortalAvancesSort;
  onSort: (key: PortalAvancesSortKey) => void;
  className?: string;
  style?: CSSProperties;
  align?: 'left' | 'right' | 'center';
  onResizeStart: (e: ReactMouseEvent) => void;
}) {
  const active = sort.key === sortKey;
  const ariaSort = !active
    ? 'none'
    : sort.dir === 'asc'
      ? 'ascending'
      : 'descending';

  return (
    <TableHead
      aria-sort={ariaSort}
      style={style}
      className={cn(
        'relative text-[12px] font-medium text-gray-500 uppercase tracking-wide',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex w-full items-center gap-1 rounded-sm py-0.5 pr-2 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
          align === 'right'
            ? 'justify-end'
            : align === 'center'
              ? 'justify-center'
              : 'justify-start',
          active && 'text-gray-800',
        )}
      >
        <span className="truncate">{label}</span>
        {active && sort.dir === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        ) : active && sort.dir === 'desc' ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" strokeWidth={2} />
        )}
      </button>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionar columna ${label}`}
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 z-40 h-full w-1.5 cursor-col-resize touch-none select-none after:absolute after:inset-y-1 after:right-0 after:w-px after:bg-gray-200 hover:after:bg-emerald-500 active:after:bg-emerald-600"
      />
    </TableHead>
  );
}

function MoneyCell({
  value,
  emphasizeSign,
}: {
  value: number | undefined;
  emphasizeSign?: boolean;
}) {
  const monto = Number(value ?? 0);
  return (
    <span
      className={cn(
        'text-[13px] tabular-nums',
        emphasizeSign
          ? monto < 0
            ? 'text-red-600 font-medium'
            : monto > 0
              ? 'text-emerald-700 font-medium'
              : 'text-gray-700'
          : 'text-gray-700',
      )}
    >
      {formatPresupuestoMonto(monto)}
    </span>
  );
}

export function VitrinaAvancesView({
  fondoNombre,
  onFondoChange,
  proyectos,
  visibleColumns,
  fondos = PORTAL_AVANCES_FONDOS,
}: {
  fondoNombre: string;
  onFondoChange: (nombre: string) => void;
  proyectos: PortalAvancesProyecto[];
  visibleColumns?: PortalAvancesColumnId[];
  fondos?: readonly PortalAvancesFondo[];
}) {
  const [sort, setSort] = useState<PortalAvancesSort>({
    key: null,
    dir: 'asc',
  });
  const [columnWidths, setColumnWidths] = useState(
    defaultPortalAvancesColumnWidths,
  );
  const dragRef = useRef<{
    id: PortalAvancesColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = clampPortalAvancesColumnWidth(
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
    (id: PortalAvancesColumnId) => (e: ReactMouseEvent) => {
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

  const colStyle = (id: PortalAvancesColumnId) =>
    portalAvancesColumnWidthStyle(columnWidths[id]);

  const ordered = sortPortalAvancesProyectos(proyectos, sort);
  const isImpulsa = portalAvancesIsExcelFondo(fondoNombre);
  const visible = new Set(
    visibleColumns ?? defaultPortalAvancesVisibleColumns(fondoNombre),
  );
  const show = (id: PortalAvancesColumnId) => visible.has(id);
  const onSortKey = (key: PortalAvancesSortKey) =>
    setSort((s) => nextPortalAvancesSort(s, key));

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pb-6 pt-4">
      <nav aria-label="Fondos de avances" className="shrink-0 mb-4 overflow-x-auto">
        <div className="flex items-stretch justify-center gap-1 sm:gap-2 min-w-max mx-auto px-2">
          {fondos.map((fondo) => {
            const active = fondoNombre === fondo.nombre;
            return (
              <button
                key={fondo.nombre}
                type="button"
                onClick={() => onFondoChange(fondo.nombre)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative px-3 py-2 text-[13px] tracking-wide whitespace-nowrap rounded-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1',
                  active
                    ? 'font-medium text-gray-900'
                    : 'font-normal text-gray-500 hover:text-gray-800',
                )}
              >
                {fondo.nombre}
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-2.5 bottom-0 h-0.5 rounded-full transition-colors',
                    active
                      ? 'bg-emerald-600'
                      : 'bg-transparent group-hover:bg-gray-300',
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {ordered.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed border-gray-200 px-4 py-10">
          <p className="text-[13px] text-gray-500">
            No hay proyectos en este fondo.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar border border-gray-200 rounded-md bg-white">
          <Table className="w-max min-w-full table-fixed border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm">
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                {show('proyecto') ? (
                  <SortableHead
                    label="Nombre proyecto"
                    sortKey="proyecto"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('proyecto')}
                    style={colStyle('proyecto')}
                    className="sticky left-0 z-30 pl-4 bg-gray-50 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.18)]"
                  />
                ) : null}
                {show('sede') ? (
                  <SortableHead
                    label="Sede"
                    sortKey="sede"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('sede')}
                    style={colStyle('sede')}
                  />
                ) : null}
                {show('escuelas') ? (
                  <SortableHead
                    label="Escuelas"
                    sortKey="escuelas"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('escuelas')}
                    style={colStyle('escuelas')}
                  />
                ) : null}
                {show('idVinculamos') ? (
                  <SortableHead
                    label="ID Vinculamos"
                    sortKey="idVinculamos"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('idVinculamos')}
                    style={colStyle('idVinculamos')}
                    className="whitespace-nowrap"
                  />
                ) : null}
                {show('estudiantes') ? (
                  <SortableHead
                    label="Estudiantes"
                    sortKey="estudiantes"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('estudiantes')}
                    style={colStyle('estudiantes')}
                    align="center"
                  />
                ) : null}
                {show('docentes') ? (
                  <SortableHead
                    label="Docentes"
                    sortKey="docentes"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('docentes')}
                    style={colStyle('docentes')}
                    align="center"
                  />
                ) : null}
                {show('beneficiarios') ? (
                  <SortableHead
                    label="Beneficiarios"
                    sortKey="beneficiarios"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('beneficiarios')}
                    style={colStyle('beneficiarios')}
                    align="center"
                  />
                ) : null}
                {!isImpulsa && show('presupuestoAdjudicado') ? (
                  <SortableHead
                    label="Presupuesto adjudicado"
                    sortKey="presupuestoAdjudicado"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('presupuestoAdjudicado')}
                    style={colStyle('presupuestoAdjudicado')}
                    align="center"
                    className="whitespace-nowrap"
                  />
                ) : null}
                {show('gantt') ? (
                  <SortableHead
                    label="Gantt"
                    sortKey="gantt"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('gantt')}
                    style={colStyle('gantt')}
                    align="center"
                  />
                ) : null}
                {show('indicadores') ? (
                  <SortableHead
                    label="Indicadores"
                    sortKey="indicadores"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('indicadores')}
                    style={colStyle('indicadores')}
                    align="center"
                  />
                ) : null}
                {isImpulsa && show('presupuestoAdjudicado') ? (
                  <SortableHead
                    label="Presupuesto adjudicado"
                    sortKey="presupuestoAdjudicado"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('presupuestoAdjudicado')}
                    style={colStyle('presupuestoAdjudicado')}
                    align="center"
                    className="whitespace-nowrap"
                  />
                ) : null}
                {show('presupuestoSolicitado') ? (
                  <SortableHead
                    label="Operativo solicitado"
                    sortKey="presupuestoSolicitado"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('presupuestoSolicitado')}
                    style={colStyle('presupuestoSolicitado')}
                    align="center"
                    className="whitespace-nowrap"
                  />
                ) : null}
                {show('presupuestoEjecutado') ? (
                  <SortableHead
                    label="Operativo ejecutado"
                    sortKey="presupuestoEjecutado"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('presupuestoEjecutado')}
                    style={colStyle('presupuestoEjecutado')}
                    align="center"
                    className="whitespace-nowrap"
                  />
                ) : null}
                {show('honorarios') ? (
                  <SortableHead
                    label="Honorarios"
                    sortKey="honorarios"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('honorarios')}
                    style={colStyle('honorarios')}
                    align="center"
                  />
                ) : null}
                {show('saldo') ? (
                  <SortableHead
                    label="Delta"
                    sortKey="saldo"
                    sort={sort}
                    onSort={onSortKey}
                    onResizeStart={startResize('saldo')}
                    style={colStyle('saldo')}
                    align="center"
                    className="pr-4 whitespace-nowrap"
                  />
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((p) => {
                const escuelasLabel = formatPortalAvancesEscuelas(p.escuelas);
                return (
                  <TableRow key={p.id} className="group hover:bg-gray-50/50">
                    {show('proyecto') ? (
                      <TableCell
                        style={colStyle('proyecto')}
                        className="sticky left-0 z-10 pl-4 text-[13px] text-gray-800 font-medium whitespace-normal break-words bg-white group-hover:bg-gray-50 shadow-[2px_0_6px_-2px_rgba(15,23,42,0.18)]"
                      >
                        {p.proyecto}
                      </TableCell>
                    ) : null}
                    {show('sede') ? (
                      <TableCell
                        style={colStyle('sede')}
                        className="text-[13px] text-gray-600"
                      >
                        {p.sede || '—'}
                      </TableCell>
                    ) : null}
                    {show('escuelas') ? (
                      <TableCell
                        style={colStyle('escuelas')}
                        className="text-[13px] text-gray-600 whitespace-normal break-words"
                      >
                        {escuelasLabel || '—'}
                      </TableCell>
                    ) : null}
                    {show('idVinculamos') ? (
                      <TableCell
                        style={colStyle('idVinculamos')}
                        className="text-[13px] text-gray-600 whitespace-nowrap"
                      >
                        {p.idVinculamos?.trim() || '—'}
                      </TableCell>
                    ) : null}
                    {show('estudiantes') ? (
                      <TableCell
                        style={colStyle('estudiantes')}
                        className="text-center text-[13px] tabular-nums text-gray-700"
                      >
                        {p.estudiantes == null ? '—' : p.estudiantes}
                      </TableCell>
                    ) : null}
                    {show('docentes') ? (
                      <TableCell
                        style={colStyle('docentes')}
                        className="text-center text-[13px] tabular-nums text-gray-700"
                      >
                        {p.docentes == null ? '—' : p.docentes}
                      </TableCell>
                    ) : null}
                    {show('beneficiarios') ? (
                      <TableCell
                        style={colStyle('beneficiarios')}
                        className="text-center text-[13px] tabular-nums text-gray-700"
                      >
                        {p.beneficiarios == null ? '—' : p.beneficiarios}
                      </TableCell>
                    ) : null}
                    {!isImpulsa && show('presupuestoAdjudicado') ? (
                      <TableCell
                        style={colStyle('presupuestoAdjudicado')}
                        className="text-center whitespace-nowrap"
                      >
                        <MoneyCell value={p.presupuestoAdjudicado} />
                      </TableCell>
                    ) : null}
                    {show('gantt') ? (
                      <TableCell style={colStyle('gantt')}>
                        <PctBarCell
                          value={p.avanceGantt}
                          barClass="bg-emerald-500"
                        />
                      </TableCell>
                    ) : null}
                    {show('indicadores') ? (
                      <TableCell style={colStyle('indicadores')}>
                        <PctBarCell
                          value={p.avanceIndicadores}
                          barClass="bg-blue-500"
                        />
                      </TableCell>
                    ) : null}
                    {isImpulsa && show('presupuestoAdjudicado') ? (
                      <TableCell
                        style={colStyle('presupuestoAdjudicado')}
                        className="text-center whitespace-nowrap"
                      >
                        <MoneyCell value={p.presupuestoAdjudicado} />
                      </TableCell>
                    ) : null}
                    {show('presupuestoSolicitado') ? (
                      <TableCell style={colStyle('presupuestoSolicitado')}>
                        <PctBarCell
                          value={p.avanceOperativoSolicitado}
                          barClass="bg-amber-500"
                        />
                      </TableCell>
                    ) : null}
                    {show('presupuestoEjecutado') ? (
                      <TableCell style={colStyle('presupuestoEjecutado')}>
                        <PctBarCell
                          value={p.avanceOperativoEjecutado}
                          barClass="bg-orange-600"
                        />
                      </TableCell>
                    ) : null}
                    {show('honorarios') ? (
                      <TableCell style={colStyle('honorarios')}>
                        {p.honorariosNoAplica ? (
                          <span className="text-[13px] text-gray-500">
                            No aplica
                          </span>
                        ) : (
                          <PctBarCell
                            value={p.avanceHonorarios}
                            barClass="bg-violet-500"
                          />
                        )}
                      </TableCell>
                    ) : null}
                    {show('saldo') ? (
                      <TableCell
                        style={colStyle('saldo')}
                        className="pr-4 text-right whitespace-nowrap"
                      >
                        <MoneyCell value={p.saldoPresupuesto} emphasizeSign />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
