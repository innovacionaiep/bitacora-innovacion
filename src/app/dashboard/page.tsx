'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  FolderKanban,
  DollarSign,
  CalendarDays,
  LineChart,
  User,
  ChevronDown,
  Download,
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  Target,
  TrendingUp,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

import { useState, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useProyectos } from '@/hooks/useProyectos';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { SimpleDonutChart } from '@/components/dashboard/SimpleDonutChart';
import { ProyectoWithRelations } from '@/types/proyecto';

type Project = ProyectoWithRelations;

export default function DashboardPage() {
  const { proyectos: proyectosIniciales, loading, error } = useProyectos();

  // ====== Estados ======
  const [currentView, setCurrentView] = useState<string>('mirada-general');
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});
  const [searchTerm, setSearchTerm] = useState<{ [key: string]: string }>({});
  const [nombreProyectoFilter, setNombreProyectoFilter] = useState<string>('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });
  // Handler simple y fluido para el Input (igual que en proyectos/page.tsx)
  const handleNombreProyectoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNombreProyectoFilter(e.target.value);
  }, []);

  // ====== Accesores de columna (mostrar / filtrar / ordenar) ======
  const getDisplayValue = (col: string, p: Project): string | number => {
    if (col === 'reuniones')
      return `${p.reunionesHechas}/${p.reunionesTotales}`;
    if (col === 'avanceGantt') return p.avanceGantt;
    if (col === 'presupuestoUsado') return p.presupuestoUsado;
    if (col === 'escuela') {
      return p.escuelas?.[0]?.escuela.nombre || 'N/A';
    }
    if (col === 'carrera') {
      return p.carreras?.[0]?.carrera.nombre || 'N/A';
    }
    return (p as any)[col];
  };

  const getSortValue = (col: string, p: Project): number | string => {
    if (col === 'reuniones') {
      return p.reunionesTotales ? p.reunionesHechas / p.reunionesTotales : 0;
    }
    if (col === 'avanceGantt') return p.avanceGantt;
    if (col === 'presupuestoUsado') return p.presupuestoUsado;
    return (p as any)[col];
  };

  // Proyectos filtrados con TODOS los filtros aplicados - MEMOIZADO para evitar re-renders
  const filteredProjects = useMemo(() => {
    if (loading) return [];
    let filtered = proyectosIniciales;

    // Filtro de nombre de proyecto (búsqueda de texto)
    if (nombreProyectoFilter.trim()) {
      filtered = filtered.filter((p) =>
        p.proyecto.toLowerCase().includes(nombreProyectoFilter.toLowerCase())
      );
    }

    // Aplicar filtros de selección múltiple
    filtered = filtered.filter((p) =>
      Object.entries(filters).every(([col, selected]) => {
        if (!selected || selected.length === 0) return true;
        
        // Para carrera, verificar si alguna de las carreras del proyecto coincide
        if (col === 'carrera') {
          const carrerasProyecto = p.carreras?.map(c => c.carrera.nombre) || [];
          return selected.some((val) => carrerasProyecto.includes(val));
        }
        
        const val = String(getDisplayValue(col, p));
        return selected.includes(val);
      })
    );

    // ordenar si hay clave seleccionada
    if (sort.key) {
      filtered.sort((a, b) => {
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
  }, [proyectosIniciales, nombreProyectoFilter, filters, sort, loading]);

  // Valores únicos DINÁMICOS para la columna abierta (excluye su propio filtro) - MEMOIZADO
  const getUniqueValues = useCallback((columna: keyof Project | 'reuniones' | 'carrera') => {
    if (loading) return [];
    let rows = proyectosIniciales;

    // Aplicar filtro de nombre de proyecto
    if (nombreProyectoFilter.trim()) {
      rows = rows.filter((p) =>
        p.proyecto.toLowerCase().includes(nombreProyectoFilter.toLowerCase())
      );
    }

    // Aplicar otros filtros excepto el de la columna actual
    rows = rows.filter((p) =>
      Object.entries(filters).every(([col, selected]) => {
        if (col === columna) return true; // ignorar su propio filtro
        if (!selected || selected.length === 0) return true;
        
        // Para carrera, verificar si alguna de las carreras del proyecto coincide
        if (col === 'carrera') {
          const carrerasProyecto = p.carreras?.map(c => c.carrera.nombre) || [];
          return selected.some((val) => carrerasProyecto.includes(val));
        }
        
        const val = String(getDisplayValue(col, p));
        return selected.includes(val);
      })
    );
    
    // Para carrera, obtener todas las carreras de todos los proyectos
    if (columna === 'carrera') {
      const todasLasCarreras = new Set<string>();
      rows.forEach((p) => {
        p.carreras?.forEach((c) => {
          todasLasCarreras.add(c.carrera.nombre);
        });
      });
      return Array.from(todasLasCarreras).sort();
    }
    
    return Array.from(
      new Set(rows.map((p) => getDisplayValue(columna as string, p)))
    ).sort();
  }, [proyectosIniciales, nombreProyectoFilter, filters, loading]);

  // ====== Acciones de menú ======
  const handleAction = (columna: string, accion: string) => {
    if (accion === 'Ordenar ASC') {
      setSort({ key: columna, dir: 'asc' });
    }
    if (accion === 'Ordenar DESC') {
      setSort({ key: columna, dir: 'desc' });
    }
  };

  // ====== Exportar a Excel ======
  const exportToExcel = () => {
    const filteredData = filteredProjects;

    // Preparar los datos para Excel
    const excelData = filteredData.map((project) => ({
      'Nombre del Proyecto': project.proyecto,
      Fondo: project.fondo,
      Sede: project.sede,
      'Escuela Líder': project.escuelas?.[0]?.escuela.nombre || 'N/A',
      'Avance Gantt (%)': project.avanceGantt,
      'Indicadores (%)': project.objetivos,
      'Presupuesto Usado': project.presupuestoUsado,
      'Presupuesto Total': project.presupuestoTotal,
      'Reuniones Realizadas': project.reunionesHechas,
      'Reuniones Totales': project.reunionesTotales,
      Participantes: project.participantes_rel?.length || 0,
    }));

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar el ancho de las columnas
    const colWidths = [
      { wch: 50 }, // Nombre del Proyecto
      { wch: 15 }, // Fondo
      { wch: 20 }, // Sede
      { wch: 30 }, // Escuela Líder
      { wch: 15 }, // Avance Gantt
      { wch: 15 }, // Indicadores
      { wch: 18 }, // Presupuesto Usado
      { wch: 18 }, // Presupuesto Total
      { wch: 20 }, // Reuniones Realizadas
      { wch: 18 }, // Reuniones Totales
      { wch: 15 }, // Participantes
    ];
    ws['!cols'] = colWidths;

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

    // Generar y descargar el archivo
    const fileName = `proyectos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // ====== Cabecera con menú ======
  const renderHeadWithButton = (
    titulo: string,
    columna: string,
    className = '',
    align: 'start' | 'center' = 'center'
  ) => (
    <TableHead className={className}>
      <div
        className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}
      >
        <span>{titulo}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => handleAction(columna, 'Ordenar ASC')}
            >
              Ordenar ASC
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAction(columna, 'Ordenar DESC')}
            >
              Ordenar DESC
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Filtrar</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 p-2">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full border rounded px-2 py-1 text-sm mb-2"
                  value={searchTerm[columna] || ''}
                  onChange={(e) =>
                    setSearchTerm({ ...searchTerm, [columna]: e.target.value })
                  }
                />

                <div className="max-h-48 overflow-y-auto pr-1">
                  {getUniqueValues(columna as any)
                    .filter((val) =>
                      String(val)
                        .toLowerCase()
                        .includes((searchTerm[columna] || '').toLowerCase())
                    )
                    .map((val) => (
                      <label
                        key={`${columna}-${val}`}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        <input
                          type="checkbox"
                          checked={
                            filters[columna]?.includes(String(val)) || false
                          }
                          onChange={(e) => {
                            const newFilters = { ...filters };
                            const v = String(val);
                            if (e.target.checked) {
                              newFilters[columna] = [
                                ...(newFilters[columna] || []),
                                v,
                              ];
                            } else {
                              newFilters[columna] =
                                newFilters[columna]?.filter((f) => f !== v) ||
                                [];
                            }
                            setFilters(newFilters);
                          }}
                        />
                        {val}
                      </label>
                    ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );

  // ====== Cálculos de métricas ======
  const totalProyectos = proyectosIniciales.length;
  const avancePromedio =
    totalProyectos > 0
      ? Math.round(
          proyectosIniciales.reduce((sum, p) => sum + p.avanceGantt, 0) /
            totalProyectos
        )
      : 0;
  const indicadoresPromedio =
    totalProyectos > 0
      ? Math.round(
          proyectosIniciales.reduce((sum, p) => sum + p.objetivos, 0) /
            totalProyectos
        )
      : 0;
  const presupuestoUsado = proyectosIniciales.reduce(
    (sum, p) => sum + p.presupuestoUsado,
    0
  );
  const presupuestoTotal = proyectosIniciales.reduce(
    (sum, p) => sum + p.presupuestoTotal,
    0
  );
  const presupuestoPromedio =
    totalProyectos > 0 ? presupuestoUsado / totalProyectos : 0;
  const reunionesRealizadas = proyectosIniciales.reduce(
    (sum, p) => sum + p.reunionesHechas,
    0
  );
  const totalParticipantes = proyectosIniciales.reduce(
    (sum, p) => sum + (p.participantes_rel?.length || 0),
    0
  );

  // ====== Cálculos para gráficos ======
  const proyectosPorFocalizacion = useMemo(() => {
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      const focalizacion = p.focalizacion || 'Sin focalización';
      grouped[focalizacion] = (grouped[focalizacion] || 0) + 1;
    });
    return Object.entries(grouped).map(([label, value]) => ({
      label,
      value,
      color:
        label === 'Social'
          ? '#3b82f6'
          : label === 'Productiva'
            ? '#10b981'
            : label === 'Ambiental'
              ? '#f59e0b'
              : '#6b7280',
    }));
  }, [proyectosIniciales]);

  const proyectosPorSede = useMemo(() => {
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      grouped[p.sede] = (grouped[p.sede] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [proyectosIniciales]);

  const proyectosPorEscuela = useMemo(() => {
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      p.escuelas?.forEach((escuelaRel) => {
        const nombre = escuelaRel.escuela.nombre;
        grouped[nombre] = (grouped[nombre] || 0) + 1;
      });
    });
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [proyectosIniciales]);

  const proyectosPorCarrera = useMemo(() => {
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      p.carreras?.forEach((carreraRel) => {
        const nombre = carreraRel.carrera.nombre;
        grouped[nombre] = (grouped[nombre] || 0) + 1;
      });
    });
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [proyectosIniciales]);

  const participantesPorRol = useMemo(() => {
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      p.participantes_rel?.forEach((participante) => {
        const rol = participante.rol;
        grouped[rol] = (grouped[rol] || 0) + 1;
      });
    });
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [proyectosIniciales]);

  // ====== Renderizado de Tabla ======
  const renderTable = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              {renderHeadWithButton(
                'Nombre del proyecto',
                'proyecto',
                'pl-7 w-[400px]',
                'start'
              )}
              {renderHeadWithButton(
                'Fondo',
                'fondo',
                'text-center w-[100px]'
              )}
              {renderHeadWithButton('Sede', 'sede', 'text-center w-[100px]')}
              {renderHeadWithButton(
                'Escuela líder',
                'escuela',
                'text-center w-[150px]'
              )}
              {renderHeadWithButton(
                'Avance Gantt',
                'avanceGantt',
                'text-center w-40'
              )}
              {renderHeadWithButton(
                'Indicadores',
                'objetivos',
                'text-center w-40'
              )}
              {renderHeadWithButton(
                'Presupuesto',
                'presupuestoUsado',
                'pl-8 text-center w-30'
              )}
              {renderHeadWithButton(
                'Reuniones',
                'reuniones',
                'text-center w-28'
              )}
              {renderHeadWithButton(
                'Participantes',
                'participantes',
                'text-center w-28'
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((p, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium pl-7">
                  {p.proyecto}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.fondo}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.sede}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.escuelas?.[0]?.escuela.nombre || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded h-3 relative">
                      <div
                        className="bg-emerald-500 h-3 rounded"
                        style={{ width: `${p.avanceGantt}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-800 ml-2">
                      {p.avanceGantt}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded h-3 relative">
                      <div
                        className="bg-emerald-500 h-3 rounded"
                        style={{ width: `${p.objetivos}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-800 ml-2">
                      {p.objetivos}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="pl-8 text-center">
                  <span className="font-bold">
                    ${p.presupuestoUsado.toLocaleString('es-CL')}
                  </span>
                  <br />
                  <span className="text-gray-500">
                    de ${p.presupuestoTotal.toLocaleString('es-CL')}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {p.reunionesHechas}/{p.reunionesTotales}
                </TableCell>
                <TableCell className="text-center">
                  {p.participantes_rel?.length || 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // ====== Componente helper para filtro con selección múltiple ======
  const MultiSelectFilter = ({
    label,
    filterKey,
    options,
    placeholder,
  }: {
    label: string;
    filterKey: string;
    options: (string | number)[];
    placeholder: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedValues = filters[filterKey] || [];
    const displayText =
      selectedValues.length === 0
        ? placeholder
        : selectedValues.length === 1
          ? String(selectedValues[0])
          : `${selectedValues.length} seleccionados`;

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <DropdownMenu 
          open={isOpen} 
          onOpenChange={(open) => {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:605',message:'onOpenChange called',data:{open:open,activeElement:document.activeElement?.tagName},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            // Solo cerrar si realmente se quiere cerrar (click fuera)
            // No cerrar automáticamente cuando se hace click en elementos dentro
            setIsOpen(open);
          }} 
          modal={false}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between text-left font-normal"
            >
              <span className={selectedValues.length === 0 ? 'text-muted-foreground' : ''}>
                {displayText}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-56 p-2" 
            align="start"
            onInteractOutside={(e) => {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:625',message:'onInteractOutside',data:{targetTag:e.target?.tagName},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              // Permitir cerrar solo cuando se hace click fuera del contenido
              const target = e.target as HTMLElement;
              const content = e.currentTarget;
              // Si el click es dentro del contenido o en un label/checkbox, prevenir el cierre
              if (content.contains(target) || target.closest('label') || target.closest('[role="checkbox"]')) {
                e.preventDefault();
              }
            }}
            onSelect={(e) => {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:635',message:'onSelect',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              // Prevenir que el dropdown se cierre al hacer click en elementos dentro
              e.preventDefault();
            }}
          >
            <div className="max-h-64 overflow-y-auto pr-1">
              {options.map((option) => {
                const value = String(option);
                const isChecked = selectedValues.includes(value);
                return (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:636',message:'Label onClick',data:{filterKey:filterKey,value:value},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
                      // #endregion
                      // No prevenir el evento - permitir que el checkbox funcione normalmente
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        // #region agent log
                        fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:648',message:'Checkbox onCheckedChange',data:{filterKey:filterKey,value:value,checked:checked},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
                        const newFilters = { ...filters };
                        if (checked) {
                          newFilters[filterKey] = [
                            ...(newFilters[filterKey] || []),
                            value,
                          ];
                        } else {
                          newFilters[filterKey] =
                            newFilters[filterKey]?.filter((f) => f !== value) ||
                            [];
                        }
                        setFilters(newFilters);
                      }}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // ====== Panel de Filtros ======
  const renderFilterPanel = () => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:628',message:'renderFilterPanel called',data:{nombreProyectoFilter:nombreProyectoFilter,filtersCount:Object.keys(filters).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const fondosUnicos = getUniqueValues('fondo' as any);
    const sedesUnicas = getUniqueValues('sede' as any);
    const escuelasUnicas = getUniqueValues('escuela' as any);
    const carrerasUnicas = getUniqueValues('carrera' as any);

    return (
      <div className="mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filtros:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Filtro de Nombre de Proyecto */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Nombre de Proyecto
            </label>
            <Input
              placeholder="Buscar proyecto..."
              value={nombreProyectoFilter}
              onChange={handleNombreProyectoChange}
              className="w-full"
            />
          </div>

          {/* Filtro de Fondo */}
          <MultiSelectFilter
            label="Fondo"
            filterKey="fondo"
            options={fondosUnicos}
            placeholder="Todos los fondos"
          />

          {/* Filtro de Sede */}
          <MultiSelectFilter
            label="Sede"
            filterKey="sede"
            options={sedesUnicas}
            placeholder="Todas las sedes"
          />

          {/* Filtro de Escuela Líder */}
          <MultiSelectFilter
            label="Escuela Líder"
            filterKey="escuela"
            options={escuelasUnicas}
            placeholder="Todas las escuelas"
          />

          {/* Filtro de Carrera */}
          <MultiSelectFilter
            label="Carrera"
            filterKey="carrera"
            options={carrerasUnicas}
            placeholder="Todas las carreras"
          />
        </div>

        {/* Botón para limpiar filtros */}
        {(nombreProyectoFilter ||
          filters.fondo?.length ||
          filters.sede?.length ||
          filters.escuela?.length ||
          filters.carrera?.length) && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNombreProyectoFilter('');
                setFilters({});
              }}
              className="bg-[#26619c] hover:bg-[#1e4d7a] text-white border-[#26619c] hover:border-[#1e4d7a]"
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ====== Vista: Lista ======
  const VistaLista = () => (
    <div className="space-y-6">
      {renderFilterPanel()}
      {renderTable()}
      <div className="flex justify-start">
        <Button
          onClick={exportToExcel}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Excel</span>
        </Button>
      </div>
    </div>
  );

  // ====== Vista: Mirada General ======
  const VistaMiradaGeneral = () => (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total proyectos</p>
                <div className="text-2xl font-bold">{totalProyectos}</div>
                <p className="text-xs text-muted-foreground">
                  Proyectos en la base de datos
                </p>
              </div>
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avance promedio Gantt</p>
                <div className="text-2xl font-bold">{avancePromedio}%</div>
                <p className="text-xs text-muted-foreground">
                  Avance promedio de las cartas Gantt
                </p>
              </div>
              <LineChart className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">% Objetivos cumplidos</p>
                <div className="text-2xl font-bold">{indicadoresPromedio}%</div>
                <p className="text-xs text-muted-foreground">
                  Promedio de objetivos cumplidos
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Presupuesto usado promedio</p>
                <div className="text-2xl font-bold">
                  ${(presupuestoPromedio / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  Promedio por proyecto
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reuniones realizadas</p>
                <div className="text-2xl font-bold">{reunionesRealizadas}</div>
                <p className="text-xs text-muted-foreground">
                  Asociadas al seguimiento
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total participantes</p>
                <div className="text-2xl font-bold">{totalParticipantes}</div>
                <p className="text-xs text-muted-foreground">
                  Miembros activos en proyectos
                </p>
              </div>
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <SimpleDonutChart
              data={proyectosPorFocalizacion}
              title="Proyectos por Focalización"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <SimpleBarChart
              data={proyectosPorSede}
              title="Distribución de Proyectos por Sede"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ====== Vista: Análisis por Escuela/Sede/Carrera ======
  const VistaAnalisisEscuela = () => (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Por Sede</h3>
            </div>
            <SimpleBarChart data={proyectosPorSede} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Por Escuela</h3>
            </div>
            <SimpleBarChart
              data={proyectosPorEscuela.slice(0, 10)}
              height={300}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Por Carrera</h3>
            </div>
            <SimpleBarChart
              data={proyectosPorCarrera.slice(0, 10)}
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tablas detalladas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Proyectos por Sede</h3>
            <div className="space-y-2">
              {proyectosPorSede.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Proyectos por Escuela</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proyectosPorEscuela.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Proyectos por Carrera</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proyectosPorCarrera.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ====== Vista: Análisis de Participantes ======
  const VistaAnalisisParticipantes = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Participantes por Rol</h3>
          </div>
          <SimpleBarChart data={participantesPorRol} height={250} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución por Rol</h3>
            <div className="space-y-2">
              {participantesPorRol.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline" className="text-base">
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Participantes por Proyecto</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proyectosIniciales
                .map((p) => ({
                  proyecto: p.proyecto,
                  participantes: p.participantes_rel?.length || 0,
                }))
                .sort((a, b) => b.participantes - a.participantes)
                .map((item) => (
                  <div
                    key={item.proyecto}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium truncate flex-1">
                      {item.proyecto}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {item.participantes}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ====== Vista: Análisis de Avances ======
  const VistaAnalisisAvances = () => {
    const avanceGanttStats = useMemo(() => {
      if (proyectosIniciales.length === 0) {
        return {
          promedio: 0,
          minimo: 0,
          maximo: 0,
          proyectosCompletados: 0,
          proyectosEnRiesgo: 0,
        };
      }
      const avances = proyectosIniciales.map((p) => p.avanceGantt);
      return {
        promedio: avancePromedio,
        minimo: Math.min(...avances),
        maximo: Math.max(...avances),
        proyectosCompletados: avances.filter((a) => a === 100).length,
        proyectosEnRiesgo: avances.filter((a) => a < 30).length,
      };
    }, [proyectosIniciales, avancePromedio]);

    const indicadoresStats = useMemo(() => {
      if (proyectosIniciales.length === 0) {
        return {
          promedio: 0,
          minimo: 0,
          maximo: 0,
          proyectosCompletados: 0,
        };
      }
      const indicadores = proyectosIniciales.map((p) => p.objetivos);
      return {
        promedio: indicadoresPromedio,
        minimo: Math.min(...indicadores),
        maximo: Math.max(...indicadores),
        proyectosCompletados: indicadores.filter((i) => i === 100).length,
      };
    }, [proyectosIniciales, indicadoresPromedio]);

    const presupuestoStats = useMemo(() => {
      if (proyectosIniciales.length === 0) {
        return {
          promedio: 0,
          minimo: 0,
          maximo: 0,
          proyectosExcedidos: 0,
        };
      }
      const porcentajes = proyectosIniciales.map(
        (p) => (p.presupuestoUsado / (p.presupuestoTotal || 1)) * 100
      );
      return {
        promedio: porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length || 0,
        minimo: Math.min(...porcentajes),
        maximo: Math.max(...porcentajes),
        proyectosExcedidos: porcentajes.filter((p) => p > 100).length,
      };
    }, [proyectosIniciales]);

    return (
      <div className="space-y-6">
        {/* Avance Gantt */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <LineChart className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Análisis de Avance Gantt</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Promedio</p>
                <p className="text-2xl font-bold">{avanceGanttStats.promedio}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Mínimo</p>
                <p className="text-2xl font-bold">{avanceGanttStats.minimo}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Máximo</p>
                <p className="text-2xl font-bold">{avanceGanttStats.maximo}%</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded">
                <p className="text-sm text-emerald-700">Completados</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {avanceGanttStats.proyectosCompletados}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded">
                <p className="text-sm text-red-700">En Riesgo</p>
                <p className="text-2xl font-bold text-red-700">
                  {avanceGanttStats.proyectosEnRiesgo}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Análisis de Indicadores</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Promedio</p>
                <p className="text-2xl font-bold">{indicadoresStats.promedio}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Mínimo</p>
                <p className="text-2xl font-bold">{indicadoresStats.minimo}%</p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Máximo</p>
                <p className="text-2xl font-bold">{indicadoresStats.maximo}%</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded">
                <p className="text-sm text-emerald-700">Completados</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {indicadoresStats.proyectosCompletados}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presupuesto */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold">Análisis de Presupuesto</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">% Promedio usado</p>
                <p className="text-2xl font-bold">
                  {presupuestoStats.promedio.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">% Mínimo</p>
                <p className="text-2xl font-bold">
                  {presupuestoStats.minimo.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">% Máximo</p>
                <p className="text-2xl font-bold">
                  {presupuestoStats.maximo.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded">
                <p className="text-sm text-red-700">Excedidos</p>
                <p className="text-2xl font-bold text-red-700">
                  {presupuestoStats.proyectosExcedidos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico comparativo */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comparativa de Avances</h3>
            <SimpleBarChart
              data={[
                {
                  label: 'Avance Gantt',
                  value: avanceGanttStats.promedio,
                  color: '#10b981',
                },
                {
                  label: 'Indicadores',
                  value: indicadoresStats.promedio,
                  color: '#3b82f6',
                },
                {
                  label: 'Presupuesto',
                  value: presupuestoStats.promedio,
                  color: '#f59e0b',
                },
              ]}
              height={150}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full px-8 pt-6 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando proyectos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 w-full px-8 pt-6 pb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error al cargar los proyectos: {error}
            </p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  const views = [
    { value: 'mirada-general', label: 'Mirada General' },
    { value: 'lista', label: 'Lista de Proyectos' },
    { value: 'analisis-escuela', label: 'Escuelas y Sedes' },
    { value: 'analisis-participantes', label: 'Participantes' },
    { value: 'analisis-avances', label: 'Avances' },
  ];

  return (
    <div className="space-y-6 w-full px-8 pt-6 pb-6">
      {/* Header con título y botones de vistas */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2">
          {views.map((view) => (
            <Button
              key={view.value}
              variant={currentView === view.value ? 'default' : 'outline'}
              onClick={() => setCurrentView(view.value)}
              className={
                currentView === view.value
                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
              }
            >
              {view.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Contenido según la vista seleccionada */}
      {currentView === 'lista' && <VistaLista />}
      {currentView === 'mirada-general' && <VistaMiradaGeneral />}
      {currentView === 'analisis-escuela' && <VistaAnalisisEscuela />}
      {currentView === 'analisis-participantes' && <VistaAnalisisParticipantes />}
      {currentView === 'analisis-avances' && <VistaAnalisisAvances />}

      {/* Botón de exportar al final (solo en vistas que no sean Lista ni Mirada General) */}
      {currentView !== 'lista' && currentView !== 'mirada-general' && (
        <div className="flex justify-end">
          <Button
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </Button>
        </div>
      )}
    </div>
  );
}
