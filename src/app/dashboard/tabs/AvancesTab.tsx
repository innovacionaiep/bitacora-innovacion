'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, LineChart, Target, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MetricChip } from '@/components/dashboard/MetricChip';
import { SectionPanel } from '@/components/dashboard/SectionPanel';
import {
  type Project,
  computePortfolioMetrics,
  presupuestoPercent,
} from '@/app/dashboard/dashboard-metrics';
import { cn } from '@/lib/utils';

type AvancesTabProps = {
  proyectos: Project[];
};

type SortKey = 'proyecto' | 'gantt' | 'indicadores' | 'presupuesto';

export function AvancesTab({ proyectos }: AvancesTabProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'gantt',
    dir: 'desc',
  });

  const metrics = useMemo(
    () => computePortfolioMetrics(proyectos),
    [proyectos]
  );

  const ganttStats = useMemo(() => {
    if (!proyectos.length)
      return { min: 0, max: 0, completados: 0, riesgo: 0 };
    const vals = proyectos.map((p) => p.avanceGantt);
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      completados: vals.filter((v) => v === 100).length,
      riesgo: vals.filter((v) => v < 30).length,
    };
  }, [proyectos]);

  const indStats = useMemo(() => {
    if (!proyectos.length) return { min: 0, max: 0, completados: 0 };
    const vals = proyectos.map((p) => p.objetivos);
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      completados: vals.filter((v) => v === 100).length,
    };
  }, [proyectos]);

  const rows = useMemo(() => {
    const mapped = proyectos.map((p) => ({
      id: p.id,
      proyecto: p.proyecto,
      gantt: p.avanceGantt,
      indicadores: p.objetivos,
      presupuesto: presupuestoPercent(p),
      presupuestoUsado: p.presupuestoUsado,
      presupuestoTotal: p.presupuestoTotal,
    }));
    return mapped.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      const res =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es');
      return sort.dir === 'asc' ? res : -res;
    });
  }, [proyectos, sort]);

  const handleSort = (key: SortKey) => {
    if (sort.key === key) {
      setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ key, dir: key === 'proyecto' ? 'asc' : 'desc' });
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => (
    <ChevronDown
      className={cn(
        'h-3.5 w-3.5',
        sort.key !== column
          ? 'opacity-30'
          : sort.dir === 'desc'
            ? 'rotate-180'
            : ''
      )}
    />
  );

  return (
    <div className="space-y-5 pb-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SectionPanel title="Avance Gantt" icon={LineChart}>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <MetricChip label="Promedio" value={`${metrics.avanceGanttProm}%`} />
            <MetricChip label="Mín" value={`${ganttStats.min}%`} />
            <MetricChip label="Máx" value={`${ganttStats.max}%`} />
          </div>
          <div className="flex gap-4 text-[12px]">
            <span className="text-gray-500">
              Completados:{' '}
              <span className="font-medium tabular-nums text-gray-800">
                {ganttStats.completados}
              </span>
            </span>
            <span className="text-gray-500">
              En riesgo (&lt;30%):{' '}
              <span className="font-medium tabular-nums text-amber-700">
                {ganttStats.riesgo}
              </span>
            </span>
          </div>
        </SectionPanel>

        <SectionPanel title="Avance de indicadores" icon={Target}>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            <MetricChip
              label="Promedio"
              value={`${metrics.indicadoresProm}%`}
            />
            <MetricChip label="Mín" value={`${indStats.min}%`} />
            <MetricChip label="Máx" value={`${indStats.max}%`} />
          </div>
          <p className="text-[12px] text-gray-500">
            Completados:{' '}
            <span className="font-medium tabular-nums text-gray-800">
              {indStats.completados}
            </span>
          </p>
        </SectionPanel>

        <SectionPanel title="Presupuesto" icon={DollarSign}>
          <div className="mb-3">
            <MetricChip
              className="w-full"
              label="% avance presupuesto (prom.)"
              value={`${metrics.presupuestoPercent}%`}
            />
          </div>
          <p className="text-[12px] text-gray-500">
            Misma fórmula que el tab Presupuesto de cada proyecto.
          </p>
        </SectionPanel>
      </div>

      <SectionPanel title="Ranking de proyectos">
        {rows.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-10">
            No hay proyectos para comparar.
          </p>
        ) : (
          <div className="-mx-5 -my-4 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  {(
                    [
                      ['proyecto', 'Proyecto'],
                      ['gantt', 'Gantt'],
                      ['indicadores', 'Indicadores'],
                      ['presupuesto', 'Presupuesto'],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="text-[11px] font-medium tracking-wide text-gray-600 bg-gray-50/95 whitespace-nowrap"
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="flex items-center gap-1 hover:text-gray-900"
                      >
                        {label}
                        <SortIcon column={key} />
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-gray-100 hover:bg-gray-50/80"
                  >
                    <TableCell
                      className="text-[13px] font-medium text-gray-800 max-w-[320px] truncate"
                      title={row.proyecto}
                    >
                      {row.proyecto}
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <ProgressBar value={row.gantt} />
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <ProgressBar value={row.indicadores} />
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <ProgressBar value={row.presupuesto} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-gray-700 w-8 text-right">
        {v}%
      </span>
    </div>
  );
}
