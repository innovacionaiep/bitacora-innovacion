'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Gauge,
  ListTodo,
  FileSignature,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FondoConveniosSection } from '@/components/fondos/FondoConveniosSection';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { BulkActivityDialog } from '../components/BulkActivityDialog';
import { BulkCoordinadoresDialog } from '../components/BulkCoordinadoresDialog';
import {
  getFondoGestionData,
  type FondoCoordinadorResumen,
} from '@/lib/actions/operaciones-fondo';
import { fondoGestionKey } from '@/lib/query-keys';
import { formatPresupuestoMonto } from '@/lib/utils/presupuesto-calculos';
import {
  clampPct,
  nextFondoTableSort,
  sortFondoGestionProyectos,
  type FondoTableSort,
  type FondoTableSortKey,
} from '@/lib/fondo-gestion-table';
import { cn } from '@/lib/utils';

type Props = {
  fondoNombre: string;
  conveniosEnabled: boolean;
};

function KpiStatChip({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const classNames = cn(
    'flex flex-1 basis-0 min-h-0 flex-col justify-center gap-0.5 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-none text-left w-full',
    onClick &&
      'cursor-pointer transition-colors hover:border-emerald-300/60 hover:bg-emerald-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
  );
  const content = (
    <>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
        <p className="text-[11px] font-medium tracking-wide text-gray-500">
          {label}
        </p>
      </div>
      <p className="text-[20px] font-semibold tabular-nums text-gray-800 leading-none pl-[1.375rem]">
        {value}
      </p>
      {hint ? (
        <p className="text-[10px] text-gray-400 pl-[1.375rem] truncate">{hint}</p>
      ) : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        {content}
      </button>
    );
  }
  return <div className={classNames}>{content}</div>;
}

function AvanceTripleChip({
  gantt,
  indicadores,
  solicitado,
  ejecutado,
}: {
  gantt: number;
  indicadores: number;
  solicitado: number;
  ejecutado: number;
}) {
  const rows = [
    { label: 'Gantt', value: gantt, bar: 'bg-emerald-500' },
    { label: 'Indicadores', value: indicadores, bar: 'bg-blue-500' },
    { label: 'Solicitado', value: solicitado, bar: 'bg-amber-500' },
    { label: 'Ejecutado', value: ejecutado, bar: 'bg-orange-600' },
  ] as const;

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-none">
      <div className="flex items-center gap-2 shrink-0">
        <Gauge className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
        <p className="text-[11px] font-medium tracking-wide text-gray-500">
          Avance promedio
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">{row.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-gray-800">
                {row.value}%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-all', row.bar)}
                style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoordinadoresFondoChip({
  coordinadores,
  onBulkAdd,
  bulkOpen,
}: {
  coordinadores: FondoCoordinadorResumen[];
  onBulkAdd?: () => void;
  bulkOpen?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-none">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
          <p className="text-[11px] font-medium tracking-wide text-gray-500 truncate">
            Coordinadores del fondo
          </p>
        </div>
        {coordinadores.length > 0 ? (
          <span className="shrink-0 text-[11px] tabular-nums text-gray-400">
            {coordinadores.length}
          </span>
        ) : null}
      </div>
      {coordinadores.length === 0 ? (
        <p className="text-[12px] text-gray-400 flex-1">Sin coordinadores asignados</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-0.5">
          {coordinadores.map((c) => (
            <li
              key={c.email.toLowerCase()}
              className="flex items-center justify-between gap-2 min-w-0"
            >
              <span
                className={cn(
                  'text-[12px] font-medium truncate',
                  c.enTodos ? 'text-emerald-800' : 'text-gray-800'
                )}
                title={`${c.nombre} · ${c.email}`}
              >
                {c.nombre}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {c.enTodos ? (
                  <span className="rounded bg-emerald-50 px-1 py-px text-[9px] font-medium text-emerald-700">
                    todos
                  </span>
                ) : null}
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    c.enTodos ? 'text-emerald-700 font-medium' : 'text-gray-400'
                  )}
                >
                  {c.proyectoCount}/{c.totalProyectos}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {onBulkAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={bulkOpen}
          onClick={onBulkAdd}
          className={cn(
            'mt-auto h-7 w-full shrink-0 justify-start gap-1.5 shadow-none text-[12px]',
            bulkOpen &&
              'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-50 hover:text-emerald-900'
          )}
        >
          <UserPlus className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
          Agregar masivos
        </Button>
      ) : null}
    </div>
  );
}

function ActividadesMasivasChip({
  onBulkAdd,
  bulkOpen,
}: {
  onBulkAdd: () => void;
  bulkOpen?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-none">
      <div className="flex items-center gap-2 shrink-0">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-gray-400" strokeWidth={1.75} />
        <p className="text-[11px] font-medium tracking-wide text-gray-500">
          Actividades masivas
        </p>
      </div>
      <p className="text-[12px] text-gray-400 flex-1 leading-snug">
        Crea la misma actividad (con tarea y fechas) en todos los proyectos del fondo.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={bulkOpen}
        onClick={onBulkAdd}
        className={cn(
          'mt-auto h-7 w-full shrink-0 justify-start gap-1.5 shadow-none text-[12px]',
          bulkOpen &&
            'border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-50 hover:text-emerald-900'
        )}
      >
        <ListTodo className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
        Actividad masiva
      </Button>
    </div>
  );
}

function PctBarCell({
  value,
  barClass,
}: {
  value: number;
  barClass: string;
}) {
  const v = clampPct(value);
  return (
    <div className="flex min-w-[108px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] tabular-nums text-gray-700">
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
  align = 'left',
}: {
  label: string;
  sortKey: FondoTableSortKey;
  sort: FondoTableSort;
  onSort: (key: FondoTableSortKey) => void;
  className?: string;
  align?: 'left' | 'right';
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
      className={cn(
        'text-[12px] font-medium text-gray-500 uppercase tracking-wide',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex w-full items-center gap-1 rounded-sm py-0.5 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
          align === 'right' ? 'justify-end' : 'justify-start',
          active && 'text-gray-800'
        )}
      >
        <span>{label}</span>
        {active && sort.dir === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        ) : active && sort.dir === 'desc' ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" strokeWidth={2} />
        )}
      </button>
    </TableHead>
  );
}

function MoneyCell({ value }: { value: number | undefined }) {
  const monto = Number(value ?? 0);
  return (
    <span className="text-[13px] tabular-nums text-gray-700">
      {formatPresupuestoMonto(monto)}
    </span>
  );
}

export function FondoGestionView({ fondoNombre, conveniosEnabled }: Props) {
  const queryClient = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [conveniosOpen, setConveniosOpen] = useState(false);
  const [sort, setSort] = useState<FondoTableSort>({ key: null, dir: 'asc' });

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: fondoGestionKey(fondoNombre),
    queryFn: async () => {
      const res = await getFondoGestionData(fondoNombre);
      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Error al cargar el fondo');
      }
      return res.data;
    },
    staleTime: 0,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: fondoGestionKey(fondoNombre),
    });

  usePageTopLoader(isLoading && !data);

  const kpis = data?.kpis;
  const proyectos = data?.proyectos ?? [];
  const proyectosOrdenados = useMemo(
    () => sortFondoGestionProyectos(proyectos, sort),
    [proyectos, sort]
  );
  const coordinadores = data?.coordinadores ?? [];
  const showConvenios = data?.conveniosEnabled ?? conveniosEnabled;

  if (isLoading && !data) {
    return <div className="h-full min-h-[200px] bg-background" />;
  }

  const error = queryError?.message ?? null;
  if (error && !data) {
    return (
      <div className="px-1 py-8">
        <p className="text-[13px] text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-1">
      <div className="shrink-0">
        <h2 className="text-4xl font-bold text-gray-900 leading-tight tracking-tight">
          {fondoNombre}
        </h2>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch min-w-0 xl:h-[11.25rem]">
        <div className="flex h-full min-h-0 flex-col gap-2">
          <KpiStatChip
            label="Proyectos"
            value={kpis?.total ?? 0}
            icon={FolderKanban}
          />
          {showConvenios ? (
            <KpiStatChip
              label="Convenios"
              value={`${kpis?.conveniosFirmados ?? 0}/${kpis?.total ?? 0}`}
              icon={FileSignature}
              hint={`${kpis?.conveniosPendientes ?? 0} pendientes · Ver detalle`}
              onClick={() => setConveniosOpen(true)}
            />
          ) : (
            <KpiStatChip
              label="Sin convenio"
              value="—"
              icon={FileSignature}
              hint="No habilitado en este fondo"
            />
          )}
        </div>
        <AvanceTripleChip
          gantt={kpis?.avanceGanttPromedio ?? 0}
          indicadores={kpis?.avanceIndicadoresPromedio ?? 0}
          solicitado={kpis?.avancePresupuestoSolicitadoPromedio ?? 0}
          ejecutado={kpis?.avancePresupuestoEjecutadoPromedio ?? 0}
        />
        <CoordinadoresFondoChip
          coordinadores={coordinadores}
          onBulkAdd={() => setCoordsOpen(true)}
          bulkOpen={coordsOpen}
        />
        <ActividadesMasivasChip
          onBulkAdd={() => setActivityOpen(true)}
          bulkOpen={activityOpen}
        />
      </div>

      {proyectos.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed border-gray-200 px-4 py-10">
          <p className="text-[13px] text-gray-500">
            No hay proyectos en este fondo.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar border border-gray-200 rounded-md bg-white">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <SortableHead
                  label="Proyecto"
                  sortKey="proyecto"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  className="pl-4"
                />
                <SortableHead
                  label="Línea"
                  sortKey="linea"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                />
                <SortableHead
                  label="Sede"
                  sortKey="sede"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                />
                <SortableHead
                  label="Presupuesto adjudicado"
                  sortKey="presupuestoAdjudicado"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  align="right"
                  className="whitespace-nowrap"
                />
                <SortableHead
                  label="Gantt"
                  sortKey="gantt"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  align="right"
                />
                <SortableHead
                  label="Indicadores"
                  sortKey="indicadores"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  align="right"
                />
                <SortableHead
                  label="Ppto. solicitado"
                  sortKey="presupuestoSolicitado"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  align="right"
                  className="whitespace-nowrap"
                />
                <SortableHead
                  label="Ppto. ejecutado"
                  sortKey="presupuestoEjecutado"
                  sort={sort}
                  onSort={(key) => setSort((s) => nextFondoTableSort(s, key))}
                  align="right"
                  className="pr-4 whitespace-nowrap"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectosOrdenados.map((p) => (
                <TableRow key={p.id} className="hover:bg-gray-50/50">
                  <TableCell className="pl-4 text-[13px] text-gray-800 font-medium max-w-[260px] whitespace-normal break-words">
                    {p.proyecto}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {p.linea || '—'}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {p.sede || '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <MoneyCell value={p.presupuestoAdjudicado} />
                  </TableCell>
                  <TableCell>
                    <PctBarCell value={p.avanceGantt} barClass="bg-emerald-500" />
                  </TableCell>
                  <TableCell>
                    <PctBarCell
                      value={p.avanceIndicadores}
                      barClass="bg-blue-500"
                    />
                  </TableCell>
                  <TableCell>
                    <PctBarCell
                      value={p.avancePresupuestoSolicitado}
                      barClass="bg-amber-500"
                    />
                  </TableCell>
                  <TableCell className="pr-4">
                    <PctBarCell
                      value={p.avancePresupuestoEjecutado}
                      barClass="bg-orange-600"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={conveniosOpen} onOpenChange={setConveniosOpen}>
        <DialogContent className="max-w-6xl w-[min(96vw,72rem)] max-h-[85vh] flex flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-14">
            <DialogTitle className="text-[15px]">
              Convenios — {fondoNombre}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
            {conveniosOpen ? (
              <FondoConveniosSection
                fondoNombre={fondoNombre}
                onChanged={invalidate}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <BulkActivityDialog
        open={activityOpen}
        onOpenChange={setActivityOpen}
        fondoNombre={fondoNombre}
        onSuccess={invalidate}
      />
      <BulkCoordinadoresDialog
        open={coordsOpen}
        onOpenChange={setCoordsOpen}
        fondoNombre={fondoNombre}
        fondoCoordinadores={coordinadores}
        onSuccess={invalidate}
      />
    </div>
  );
}
