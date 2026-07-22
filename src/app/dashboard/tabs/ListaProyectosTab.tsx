'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleMultiSelect } from '@/components/dashboard/SimpleMultiSelect';
import {
  type Project,
  type ProyectoEstado,
  calcularEstadoProyecto,
  calcularFechasProyecto,
  formatearFecha,
  parseSedeString,
  presupuestoPercent,
} from '@/app/dashboard/dashboard-metrics';
import { cn } from '@/lib/utils';

type ListaProyectosTabProps = {
  proyectos: Project[];
};

type Derived = {
  proyecto: Project;
  estado: ProyectoEstado;
  fechas: { fechaInicio: string | null; fechaFin: string | null };
};

function estadoBadgeClass(estado: ProyectoEstado): string {
  if (estado === 'Finalizado')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (estado === 'Atrasado')
    return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export function ListaProyectosTab({ proyectos }: ListaProyectosTabProps) {
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});
  const [nombreProyectoFilter, setNombreProyectoFilter] = useState('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });

  const emptyArray = useMemo(() => [] as string[], []);
  const selectedFondos = filters.fondo || emptyArray;
  const selectedSedes = filters.sede || emptyArray;
  const selectedEscuelas = filters.escuela || emptyArray;
  const selectedCarreras = filters.carrera || emptyArray;
  const selectedFocos = filters.focalizacion || emptyArray;

  const handleFilterSelectionChange = useCallback(
    (filterKey: string, value: string, checked: boolean) => {
      setFilters((prev) => {
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

  const proyectosDerived: Derived[] = useMemo(
    () =>
      proyectos.map((p) => ({
        proyecto: p,
        estado: calcularEstadoProyecto(p),
        fechas: calcularFechasProyecto(p),
      })),
    [proyectos]
  );

  const derivedById = useMemo(
    () => new Map(proyectosDerived.map((d) => [d.proyecto.id, d])),
    [proyectosDerived]
  );

  const getDisplayValue = (col: string, p: Project): string | number => {
    if (col === 'avanceGantt') return p.avanceGantt;
    if (col === 'presupuestoUsado') return p.presupuestoUsado;
    if (col === 'escuela') {
      const nombres =
        p.escuelas?.map((e) => e.escuela.nombre).filter(Boolean) ?? [];
      return nombres.length > 0 ? nombres.join(', ') : 'N/A';
    }
    if (col === 'carrera') {
      return p.carreras?.[0]?.carrera.nombre || 'N/A';
    }
    if (col === 'focalizacion') return p.focalizacion || 'N/A';
    if (col === 'estado') return calcularEstadoProyecto(p);
    if (col === 'fechaInicio' || col === 'fechaFin') {
      const fechas = calcularFechasProyecto(p);
      return col === 'fechaInicio'
        ? formatearFecha(fechas.fechaInicio)
        : formatearFecha(fechas.fechaFin);
    }
    return (p as Record<string, unknown>)[col] as string;
  };

  const getSortValue = (col: string, p: Project): number | string => {
    if (col === 'avanceGantt') return p.avanceGantt;
    if (col === 'objetivos') return p.objetivos;
    if (col === 'presupuestoUsado') return presupuestoPercent(p);
    if (col === 'focalizacion') return p.focalizacion || 'N/A';
    if (col === 'estado') {
      const estado = calcularEstadoProyecto(p);
      if (estado === 'Finalizado') return 3;
      if (estado === 'En Ejecución') return 2;
      return 1;
    }
    if (col === 'fechaInicio' || col === 'fechaFin') {
      const fechas = calcularFechasProyecto(p);
      const fecha =
        col === 'fechaInicio' ? fechas.fechaInicio : fechas.fechaFin;
      return fecha ? new Date(fecha + 'T00:00:00').getTime() : 0;
    }
    if (col === 'participantes') return p.participantes_rel?.length || 0;
    if (col === 'variacionGantt') return p.variacionGantt;
    if (col === 'variacionObjetivos') return p.variacionObjetivos;
    return (p as Record<string, unknown>)[col] as number | string;
  };

  const filteredProjects = useMemo(() => {
    let filtered = proyectosDerived.map((d) => d.proyecto);

    if (nombreProyectoFilter.trim()) {
      const q = nombreProyectoFilter.toLowerCase();
      filtered = filtered.filter((p) => p.proyecto.toLowerCase().includes(q));
    }

    filtered = filtered.filter((p) =>
      Object.entries(filters).every(([col, selected]) => {
        if (!selected || selected.length === 0) return true;

        if (col === 'sede') {
          const sedesProyecto = parseSedeString(p.sede);
          const k =
            sedesProyecto.length === 0
              ? p.sede?.trim() || 'Sin sede'
              : null;
          if (k) return selected.includes(k);
          return selected.some((s) => sedesProyecto.includes(s));
        }

        if (col === 'escuela') {
          const escuelasProyecto =
            p.escuelas?.map((e) => e.escuela.nombre) || [];
          return selected.some((val) => escuelasProyecto.includes(val));
        }

        if (col === 'carrera') {
          const carrerasProyecto =
            p.carreras?.map((c) => c.carrera.nombre) || [];
          return selected.some((val) => carrerasProyecto.includes(val));
        }

        const val = String(getDisplayValue(col, p));
        return selected.includes(val);
      })
    );

    if (sort.key) {
      filtered = [...filtered].sort((a, b) => {
        const va = getSortValue(sort.key!, a);
        const vb = getSortValue(sort.key!, b);
        const res =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb), 'es');
        return sort.dir === 'asc' ? res : -res;
      });
    }

    return filtered;
  }, [proyectosDerived, nombreProyectoFilter, filters, sort]);

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
  const focalizacionesUnicas = useMemo(
    () =>
      Array.from(
        new Set(proyectos.map((p) => p.focalizacion || 'N/A'))
      )
        .filter(Boolean)
        .sort(),
    [proyectos]
  );

  const handleAction = (columna: string, accion: string) => {
    if (accion === 'Ordenar ASC') setSort({ key: columna, dir: 'asc' });
    if (accion === 'Ordenar DESC') setSort({ key: columna, dir: 'desc' });
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const excelData = filteredProjects.map((project) => {
      const estado = calcularEstadoProyecto(project);
      const fechas = calcularFechasProyecto(project);
      return {
        'Nombre del Proyecto': project.proyecto,
        Estado: estado,
        'Fecha Inicio': formatearFecha(fechas.fechaInicio),
        'Fecha Fin': formatearFecha(fechas.fechaFin),
        Fondo: project.fondo,
        Sede: project.sede,
        'Escuela(s)':
          (project.escuelas?.map((e) => e.escuela.nombre) ?? []).join(', ') ||
          'N/A',
        Foco: project.focalizacion || 'N/A',
        'Avance Gantt (%)': project.avanceGantt,
        'Var. Gantt (%)': project.variacionGantt,
        'Indicadores (%)': project.objetivos,
        'Var. Indicadores (%)': project.variacionObjetivos,
        'Presupuesto (%)': presupuestoPercent(project),
        'Presupuesto Usado': project.presupuestoUsado,
        'Presupuesto Total': project.presupuestoTotal,
        Participantes: project.participantes_rel?.length || 0,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 50 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 30 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
    XLSX.writeFile(
      wb,
      `proyectos_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const renderHead = (
    titulo: string,
    columna: string,
    className = '',
    align: 'start' | 'center' = 'center'
  ) => (
    <TableHead
      className={cn(
        'whitespace-nowrap text-[11px] font-medium tracking-wide text-gray-600 bg-gray-50/95',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1',
          align === 'center' ? 'justify-center' : 'justify-start'
        )}
      >
        <span>{titulo}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-5 w-5 inline-flex items-center justify-center rounded-sm text-gray-400 hover:text-gray-700"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-[13px]">
            <DropdownMenuItem onClick={() => handleAction(columna, 'Ordenar ASC')}>
              Ordenar ASC
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAction(columna, 'Ordenar DESC')}
            >
              Ordenar DESC
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );

  const hasFilters =
    !!nombreProyectoFilter ||
    (filters.fondo?.length ?? 0) > 0 ||
    (filters.sede?.length ?? 0) > 0 ||
    (filters.escuela?.length ?? 0) > 0 ||
    (filters.carrera?.length ?? 0) > 0 ||
    (filters.focalizacion?.length ?? 0) > 0;

  return (
    <div className="space-y-5 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
            Nombre de proyecto
          </label>
          <Input
            placeholder="Buscar proyecto..."
            value={nombreProyectoFilter}
            onChange={(e) => setNombreProyectoFilter(e.target.value)}
            className="h-9 text-[13px] border-gray-200 shadow-none"
          />
        </div>
        <SimpleMultiSelect
          label="Fondo"
          filterKey="fondo"
          options={fondosUnicos}
          placeholder="Todos los fondos"
          selectedValues={selectedFondos}
          onSelectionChange={handleFilterSelectionChange}
        />
        <SimpleMultiSelect
          label="Sede"
          filterKey="sede"
          options={sedesUnicas}
          placeholder="Todas las sedes"
          selectedValues={selectedSedes}
          onSelectionChange={handleFilterSelectionChange}
        />
        <SimpleMultiSelect
          label="Escuela"
          filterKey="escuela"
          options={escuelasUnicas}
          placeholder="Todas las escuelas"
          selectedValues={selectedEscuelas}
          onSelectionChange={handleFilterSelectionChange}
        />
        <SimpleMultiSelect
          label="Carrera"
          filterKey="carrera"
          options={carrerasUnicas}
          placeholder="Todas las carreras"
          selectedValues={selectedCarreras}
          onSelectionChange={handleFilterSelectionChange}
        />
        <SimpleMultiSelect
          label="Foco"
          filterKey="focalizacion"
          options={focalizacionesUnicas}
          placeholder="Todos los focos"
          selectedValues={selectedFocos}
          onSelectionChange={handleFilterSelectionChange}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-gray-400 tabular-nums">
          {filteredProjects.length} de {proyectos.length} proyectos
        </p>
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setNombreProyectoFilter('');
                setFilters({});
              }}
              className="text-[13px] text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-sm"
            >
              Limpiar filtros
            </button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="h-9 border-gray-200 bg-white text-[13px] text-gray-600 shadow-none hover:text-emerald-700"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-none">
        <div className="overflow-x-auto custom-scrollbar">
          <div style={{ minWidth: '2100px' }}>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100 hover:bg-transparent">
                  {renderHead(
                    'Nombre del proyecto',
                    'proyecto',
                    'pl-4 sticky left-0 z-10 min-w-[280px]',
                    'start'
                  )}
                  {renderHead('Estado', 'estado', 'text-center min-w-[120px]')}
                  {renderHead(
                    'Fecha inicio',
                    'fechaInicio',
                    'text-center min-w-[110px]'
                  )}
                  {renderHead(
                    'Fecha fin',
                    'fechaFin',
                    'text-center min-w-[110px]'
                  )}
                  {renderHead('Fondo', 'fondo', 'text-center min-w-[100px]')}
                  {renderHead('Sede', 'sede', 'text-center min-w-[120px]')}
                  {renderHead(
                    'Escuela',
                    'escuela',
                    'text-center min-w-[160px]'
                  )}
                  {renderHead(
                    'Foco',
                    'focalizacion',
                    'text-center min-w-[100px]'
                  )}
                  {renderHead(
                    'Avance Gantt',
                    'avanceGantt',
                    'text-center min-w-[150px]'
                  )}
                  {renderHead(
                    'Var. Gantt',
                    'variacionGantt',
                    'text-center min-w-[80px]'
                  )}
                  {renderHead(
                    'Indicadores',
                    'objetivos',
                    'text-center min-w-[150px]'
                  )}
                  {renderHead(
                    'Var. Ind.',
                    'variacionObjetivos',
                    'text-center min-w-[80px]'
                  )}
                  {renderHead(
                    'Presupuesto',
                    'presupuestoUsado',
                    'text-center min-w-[150px]'
                  )}
                  {renderHead(
                    'Participantes',
                    'participantes',
                    'text-center min-w-[100px]'
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={14}
                      className="text-center text-[13px] text-gray-400 py-12"
                    >
                      No hay proyectos con estos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((p) => {
                    const derived = derivedById.get(p.id);
                    const estado =
                      derived?.estado ?? calcularEstadoProyecto(p);
                    const fechas =
                      derived?.fechas ?? calcularFechasProyecto(p);
                    const pctPresupuesto = presupuestoPercent(p);

                    return (
                      <TableRow
                        key={p.id}
                        className="border-gray-100 hover:bg-gray-50/80 group"
                      >
                        <TableCell
                          className="pl-4 sticky left-0 z-10 bg-white group-hover:bg-gray-50/80 text-[13px] text-gray-800 font-medium max-w-[320px] whitespace-normal break-words [overflow-wrap:anywhere]"
                          title={p.proyecto}
                        >
                          {p.proyecto}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-medium rounded border px-1.5 py-0.5 shadow-none',
                              estadoBadgeClass(estado)
                            )}
                          >
                            {estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600 tabular-nums">
                          {formatearFecha(fechas.fechaInicio)}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600 tabular-nums">
                          {formatearFecha(fechas.fechaFin)}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600">
                          {p.fondo}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600">
                          {p.sede}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600">
                          {(p.escuelas?.map((e) => e.escuela.nombre) ?? []).join(
                            ', '
                          ) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center text-[12px] text-gray-600">
                          {p.focalizacion || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <ProgressCell value={p.avanceGantt} />
                        </TableCell>
                        <TableCell className="text-center">
                          <VarCell value={p.variacionGantt} />
                        </TableCell>
                        <TableCell>
                          <ProgressCell value={p.objetivos} />
                        </TableCell>
                        <TableCell className="text-center">
                          <VarCell value={p.variacionObjetivos} />
                        </TableCell>
                        <TableCell>
                          <ProgressCell value={pctPresupuesto} />
                        </TableCell>
                        <TableCell className="text-center text-[12px] tabular-nums text-gray-700">
                          {p.participantes_rel?.length || 0}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressCell({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
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

function VarCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        'text-[12px] font-medium tabular-nums',
        value > 0
          ? 'text-emerald-600'
          : value < 0
            ? 'text-amber-600'
            : 'text-gray-400'
      )}
    >
      {value > 0 ? '+' : ''}
      {value}%
    </span>
  );
}
