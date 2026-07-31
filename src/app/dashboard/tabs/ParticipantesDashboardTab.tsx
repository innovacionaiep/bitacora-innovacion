'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
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
import { DistributionList } from '@/components/dashboard/DistributionList';
import {
  type ParticipantesFiltro,
  type Project,
  ROLES_ORDEN,
  computePortfolioMetrics,
  countParticipantesByFiltro,
} from '@/app/dashboard/dashboard-metrics';
import { cn } from '@/lib/utils';

type ParticipantesDashboardTabProps = {
  proyectos: Project[];
};

const FILTROS: ParticipantesFiltro[] = [
  'Rol',
  'Cargo',
  'Sede',
  'Escuela',
  'Carrera',
  'Socio Comunitario',
];

export function ParticipantesDashboardTab({
  proyectos,
}: ParticipantesDashboardTabProps) {
  const [filtro, setFiltro] = useState<ParticipantesFiltro>('Rol');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });

  const metrics = useMemo(
    () => computePortfolioMetrics(proyectos),
    [proyectos]
  );

  const distribution = useMemo(
    () => countParticipantesByFiltro(proyectos, filtro),
    [proyectos, filtro]
  );

  const matriz = useMemo(() => {
    return proyectos.map((p) => {
      const conteo: Record<string, number> = {};
      ROLES_ORDEN.forEach((rol) => {
        conteo[rol] = 0;
      });
      p.participantes_rel?.forEach((part) => {
        if (part.rol in conteo) conteo[part.rol] += 1;
      });
      return {
        id: p.id,
        proyecto: p.proyecto,
        fondo: p.fondo,
        sede: p.sede,
        escuela:
          (p.escuelas?.map((e) => e.escuela.nombre) ?? []).join(', ') || 'N/A',
        ...conteo,
      };
    });
  }, [proyectos]);

  const matrizOrdenada = useMemo(() => {
    if (!sort.key) return matriz;
    const key = sort.key;
    return [...matriz].sort((a, b) => {
      const rowA = a as Record<string, string | number>;
      const rowB = b as Record<string, string | number>;
      const valA = rowA[key] ?? 0;
      const valB = rowB[key] ?? 0;
      const res =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB), 'es');
      return sort.dir === 'asc' ? res : -res;
    });
  }, [matriz, sort]);

  const handleSort = (column: string) => {
    if (sort.key === column) {
      setSort({
        key: column,
        dir: sort.dir === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSort({ key: column, dir: 'asc' });
    }
  };

  const SortIcon = ({ column }: { column: string }) => (
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
    <div className="flex flex-col gap-5 h-full min-h-0 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap gap-2.5">
          <MetricChip
            label="Total participantes"
            value={metrics.totalParticipantes}
            icon={Users}
          />
          {metrics.desgloseRoles
            .filter((r) => r.cantidad > 0)
            .map(({ rol, cantidad }) => (
              <MetricChip key={rol} label={rol} value={cantidad} />
            ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        <SectionPanel
          title={`Participantes por ${filtro}`}
          icon={Users}
          className="w-full lg:w-[260px] xl:w-[280px] shrink-0 flex flex-col"
          bodyClassName="flex flex-col flex-1 min-h-0"
        >
          <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-100 pb-2">
            {FILTROS.map((f) => {
              const active = filtro === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  className={cn(
                    'relative px-2.5 py-1.5 text-[12px] tracking-wide transition-colors',
                    active
                      ? 'font-medium text-gray-900'
                      : 'text-gray-500 hover:text-gray-800'
                  )}
                >
                  {f}
                  {active ? (
                    <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-emerald-600 rounded-full" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 max-h-[480px]">
            <DistributionList data={distribution} barMode="ofMax" />
          </div>
        </SectionPanel>

        <SectionPanel
          title="Matriz por proyecto"
          className="flex-1 min-w-0 flex flex-col"
          bodyClassName="flex-1 min-h-0 !p-0"
        >
          <div className="overflow-auto custom-scrollbar max-h-[560px]">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  {(
                    [
                      ['proyecto', 'Proyecto', true],
                      ['fondo', 'Fondo', false],
                      ['sede', 'Sede', false],
                      ['escuela', 'Escuela', false],
                      ...ROLES_ORDEN.map(
                        (r) => [r, r, false] as [string, string, boolean]
                      ),
                    ] as [string, string, boolean][]
                  ).map(([key, label, sticky]) => (
                    <TableHead
                      key={key}
                      className={cn(
                        'text-[11px] font-medium tracking-wide text-gray-600 bg-gray-50/95 whitespace-nowrap',
                        sticky && 'sticky left-0 z-10'
                      )}
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
                {matrizOrdenada.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + ROLES_ORDEN.length}
                      className="text-center text-[13px] text-gray-400 py-10"
                    >
                      Sin participantes registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  matrizOrdenada.map((fila) => (
                    <TableRow
                      key={fila.id}
                      className="border-gray-100 hover:bg-gray-50/80 group"
                    >
                      <TableCell
                        className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/80 text-[13px] font-medium text-gray-800 max-w-[240px] truncate"
                        title={fila.proyecto}
                      >
                        {fila.proyecto}
                      </TableCell>
                      <TableCell className="text-[12px] text-gray-600 whitespace-nowrap">
                        {fila.fondo}
                      </TableCell>
                      <TableCell className="text-[12px] text-gray-600 whitespace-nowrap">
                        {fila.sede}
                      </TableCell>
                      <TableCell className="text-[12px] text-gray-600 whitespace-nowrap max-w-[160px] truncate">
                        {fila.escuela}
                      </TableCell>
                      {ROLES_ORDEN.map((rol) => (
                        <TableCell
                          key={rol}
                          className="text-center text-[12px] tabular-nums text-gray-700"
                        >
                          {(fila as Record<string, string | number>)[rol] || 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
