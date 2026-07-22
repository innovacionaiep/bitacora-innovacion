'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MetricChip } from '@/components/dashboard/MetricChip';
import { SectionPanel } from '@/components/dashboard/SectionPanel';
import { SimpleMultiSelect } from '@/components/dashboard/SimpleMultiSelect';
import {
  type AnalisisDimension,
  type Project,
  computeMatrixRows,
  formatPresupuesto,
  parseSedeString,
} from '@/app/dashboard/dashboard-metrics';
import { cn } from '@/lib/utils';

type EscuelasSedesTabProps = {
  proyectos: Project[];
};

const DIMS: { value: AnalisisDimension; label: string }[] = [
  { value: 'sede', label: 'Sedes' },
  { value: 'escuela', label: 'Escuelas' },
  { value: 'carrera', label: 'Carreras' },
  { value: 'comuna', label: 'Comunas' },
  { value: 'grupos-interes', label: 'Grupos de interés' },
];

export function EscuelasSedesTab({ proyectos }: EscuelasSedesTabProps) {
  const [analisisDimension, setAnalisisDimension] =
    useState<AnalisisDimension>('sede');
  const [filtersPertinencia, setFiltersPertinencia] = useState<{
    [key: string]: string[];
  }>({});

  const emptyArray = useMemo(() => [] as string[], []);
  const selectedFondos = filtersPertinencia.fondo || emptyArray;
  const selectedSedes = filtersPertinencia.sede || emptyArray;
  const selectedEscuelas = filtersPertinencia.escuela || emptyArray;
  const selectedCarreras = filtersPertinencia.carrera || emptyArray;
  const selectedComunas = filtersPertinencia.comuna || emptyArray;
  const selectedGrupos =
    filtersPertinencia['grupos-interes'] || emptyArray;

  const handleFilterChange = useCallback(
    (filterKey: string, value: string, checked: boolean) => {
      setFiltersPertinencia((prev) => {
        const next = { ...prev };
        if (checked) {
          next[filterKey] = [...(next[filterKey] || []), value];
        } else {
          next[filterKey] =
            next[filterKey]?.filter((f) => f !== value) || [];
        }
        return next;
      });
    },
    []
  );

  const fondosUnicos = useMemo(
    () => Array.from(new Set(proyectos.map((p) => p.fondo))).sort(),
    [proyectos]
  );
  const sedesUnicas = useMemo(() => {
    const todas = proyectos.flatMap((p) => {
      const parts = parseSedeString(p.sede);
      return parts.length > 0 ? parts : [p.sede?.trim() || 'Sin sede'];
    });
    return Array.from(new Set(todas)).filter(Boolean).sort();
  }, [proyectos]);
  const escuelasUnicas = useMemo(() => {
    const set = new Set<string>();
    proyectos.forEach((p) =>
      p.escuelas?.forEach((e) => set.add(e.escuela.nombre))
    );
    return Array.from(set).sort();
  }, [proyectos]);
  const carrerasUnicas = useMemo(() => {
    const set = new Set<string>();
    proyectos.forEach((p) =>
      p.carreras?.forEach((c) => set.add(c.carrera.nombre))
    );
    return Array.from(set).sort();
  }, [proyectos]);
  const comunasUnicas = useMemo(() => {
    const set = new Set<string>();
    proyectos.forEach((p) =>
      p.comunas?.forEach((rel) => {
        set.add(`${rel.comuna.nombre} (${rel.comuna.region})`);
      })
    );
    return Array.from(set).sort();
  }, [proyectos]);
  const gruposUnicos = useMemo(() => {
    const set = new Set<string>();
    proyectos.forEach((p) =>
      p.gruposInteres?.forEach((rel) => set.add(rel.grupoInteres.nombre))
    );
    return Array.from(set).sort();
  }, [proyectos]);

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) =>
      Object.entries(filtersPertinencia).every(([col, selected]) => {
        if (!selected || selected.length === 0) return true;

        if (col === 'carrera') {
          const vals = p.carreras?.map((c) => c.carrera.nombre) || [];
          return selected.some((val) => vals.includes(val));
        }
        if (col === 'escuela') {
          const vals = p.escuelas?.map((e) => e.escuela.nombre) || [];
          return selected.some((val) => vals.includes(val));
        }
        if (col === 'comuna') {
          const vals =
            p.comunas?.map(
              (rel) => `${rel.comuna.nombre} (${rel.comuna.region})`
            ) || [];
          return selected.some((val) => vals.includes(val));
        }
        if (col === 'grupos-interes') {
          const vals =
            p.gruposInteres?.map((rel) => rel.grupoInteres.nombre) || [];
          return selected.some((val) => vals.includes(val));
        }
        if (col === 'fondo') return selected.includes(p.fondo);
        if (col === 'sede') {
          const sedesProyecto = parseSedeString(p.sede);
          const k =
            sedesProyecto.length === 0
              ? p.sede?.trim() || 'Sin sede'
              : null;
          if (k) return selected.includes(k);
          return selected.some((s) => sedesProyecto.includes(s));
        }
        return true;
      })
    );
  }, [proyectos, filtersPertinencia]);

  const matrixRows = useMemo(
    () => computeMatrixRows(proyectosFiltrados, analisisDimension),
    [proyectosFiltrados, analisisDimension]
  );

  const summary = useMemo(() => {
    const n = proyectosFiltrados.length;
    const gantt =
      n > 0
        ? Math.round(
            proyectosFiltrados.reduce((s, p) => s + p.avanceGantt, 0) / n
          )
        : 0;
    const ind =
      n > 0
        ? Math.round(
            proyectosFiltrados.reduce((s, p) => s + p.objetivos, 0) / n
          )
        : 0;
    return {
      categorias: matrixRows.length,
      proyectos: n,
      gantt,
      indicadores: ind,
    };
  }, [matrixRows, proyectosFiltrados]);

  const hasFilters = Object.values(filtersPertinencia).some(
    (arr) => (arr?.length ?? 0) > 0
  );

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100">
        {DIMS.map((d) => {
          const active = analisisDimension === d.value;
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => setAnalisisDimension(d.value)}
              className={cn(
                'relative px-3 py-2 text-[13px] tracking-wide transition-colors',
                active
                  ? 'font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {d.label}
              {active ? (
                <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-emerald-600 rounded-full" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <MetricChip label="Categorías" value={summary.categorias} />
        <MetricChip label="Proyectos" value={summary.proyectos} />
        <MetricChip label="Gantt prom." value={`${summary.gantt}%`} />
        <MetricChip
          label="Indicadores prom."
          value={`${summary.indicadores}%`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SimpleMultiSelect
          label="Fondo"
          filterKey="fondo"
          options={fondosUnicos}
          placeholder="Todos"
          selectedValues={selectedFondos}
          onSelectionChange={handleFilterChange}
        />
        <SimpleMultiSelect
          label="Sede"
          filterKey="sede"
          options={sedesUnicas}
          placeholder="Todas"
          selectedValues={selectedSedes}
          onSelectionChange={handleFilterChange}
        />
        <SimpleMultiSelect
          label="Escuela"
          filterKey="escuela"
          options={escuelasUnicas}
          placeholder="Todas"
          selectedValues={selectedEscuelas}
          onSelectionChange={handleFilterChange}
        />
        <SimpleMultiSelect
          label="Carrera"
          filterKey="carrera"
          options={carrerasUnicas}
          placeholder="Todas"
          selectedValues={selectedCarreras}
          onSelectionChange={handleFilterChange}
        />
        <SimpleMultiSelect
          label="Comuna"
          filterKey="comuna"
          options={comunasUnicas}
          placeholder="Todas"
          selectedValues={selectedComunas}
          onSelectionChange={handleFilterChange}
        />
        <SimpleMultiSelect
          label="Grupos de interés"
          filterKey="grupos-interes"
          options={gruposUnicos}
          placeholder="Todos"
          selectedValues={selectedGrupos}
          onSelectionChange={handleFilterChange}
        />
      </div>

      {hasFilters ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setFiltersPertinencia({})}
            className="text-[13px] text-gray-500 hover:text-gray-800"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      <SectionPanel title="Matriz de pertinencia">
        {matrixRows.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-10">
            No hay datos para esta dimensión.
          </p>
        ) : (
          <div className="-mx-5 -my-4 overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  {[
                    'Dimensión',
                    'Proyectos',
                    'Comunas',
                    'Escuelas',
                    'Carreras',
                    'Gantt prom.',
                    'Indicadores prom.',
                    'Presupuesto prom.',
                    'Participantes',
                    'Socios',
                    'Presupuesto usado',
                    'Presupuesto total',
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[11px] font-medium tracking-wide text-gray-600 bg-gray-50/95 whitespace-nowrap"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixRows.map((row) => {
                  const tip = (label: string, items: string[]) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                          {label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        variant="light"
                        className="max-w-sm py-2"
                      >
                        {items.length ? (
                          <ul className="list-disc list-inside space-y-0.5 text-left text-[12px]">
                            {items.map((name, j) => (
                              <li key={j}>{name}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[12px] text-gray-400">
                            Sin datos
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );

                  return (
                    <TableRow
                      key={row.dimension}
                      className="border-gray-100 hover:bg-gray-50/80"
                    >
                      <TableCell className="text-[13px] font-medium text-gray-800 whitespace-nowrap">
                        {row.dimension}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {tip(String(row.proyectos), row.proyectosNombres)}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {tip(String(row.comunas), row.comunasNombres)}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {tip(String(row.escuelas), row.escuelasNombres)}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {tip(String(row.carreras), row.carrerasNombres)}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <MiniBar
                          value={Math.round(row.avanceGanttProm)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <MiniBar
                          value={Math.round(row.avanceObjetivosProm)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <MiniBar
                          value={Math.round(row.avancePresupuestoProm)}
                        />
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {row.participantes}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-center">
                        {tip(
                          String(row.sociosComunitarios),
                          row.sociosNombres
                        )}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-right whitespace-nowrap">
                        {formatPresupuesto(row.presupuestoUsado)}
                      </TableCell>
                      <TableCell className="text-[12px] tabular-nums text-right whitespace-nowrap">
                        {formatPresupuesto(row.presupuestoTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

function MiniBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-1.5 rounded-full"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-gray-700 w-8 text-right">
        {v}%
      </span>
    </div>
  );
}
