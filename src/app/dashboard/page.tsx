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
} from '@/components/ui/dropdown-menu';

import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import * as XLSX from 'xlsx';
import { useProyectos } from '@/hooks/useProyectos';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { SimpleDonutChart } from '@/components/dashboard/SimpleDonutChart';
import { ProyectoConVariaciones } from '@/types/proyecto';

type Project = ProyectoConVariaciones;

// ====== Componente SimpleMultiSelect - Sin DropdownMenu de Radix ======
// Usa un div posicionado simple con click-outside handler
// Memoizado con React.memo para evitar re-renders innecesarios
interface SimpleMultiSelectProps {
  label: string;
  filterKey: string;
  options: (string | number)[];
  placeholder: string;
  selectedValues: string[];
  onSelectionChange: (filterKey: string, value: string, checked: boolean) => void;
}

const SimpleMultiSelect = memo(function SimpleMultiSelect({
  label,
  filterKey,
  options,
  placeholder,
  selectedValues,
  onSelectionChange,
}: SimpleMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Usar setTimeout para evitar que el click que abre el menú lo cierre inmediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? String(selectedValues[0])
        : `${selectedValues.length} seleccionados`;

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={selectedValues.length === 0 ? 'text-muted-foreground' : ''}>
            {displayText}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
            <div className="max-h-64 overflow-y-auto">
              {options.map((option) => {
                const value = String(option);
                const isChecked = selectedValues.includes(value);
                return (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        onSelectionChange(filterKey, value, checked === true);
                      }}
                      className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white data-[state=checked]:border-emerald-500"
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const { proyectos: proyectosIniciales, loading, error } = useProyectos();

  // ====== Estados ======
  const [currentView, setCurrentView] = useState<string>('mirada-general');
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});
  const [nombreProyectoFilter, setNombreProyectoFilter] = useState<string>('');
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });
  const [graficoSedeEscuela, setGraficoSedeEscuela] = useState<'sede' | 'escuela'>('sede');
  
  // Handler simple y fluido para el Input (igual que en proyectos/page.tsx)
  const handleNombreProyectoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNombreProyectoFilter(e.target.value);
  }, []);

  // Handler para cambios en filtros de selección múltiple
  const handleFilterSelectionChange = useCallback((filterKey: string, value: string, checked: boolean) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters };
      if (checked) {
        newFilters[filterKey] = [...(newFilters[filterKey] || []), value];
      } else {
        newFilters[filterKey] = newFilters[filterKey]?.filter((f) => f !== value) || [];
      }
      return newFilters;
    });
  }, []);

  // Arrays estables para selectedValues (evita crear nuevos arrays vacíos en cada render)
  const emptyArray = useMemo(() => [] as string[], []);
  const selectedFondos = filters.fondo || emptyArray;
  const selectedSedes = filters.sede || emptyArray;
  const selectedEscuelas = filters.escuela || emptyArray;
  const selectedCarreras = filters.carrera || emptyArray;
  const selectedFocos = filters.focalizacion || emptyArray;


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
    if (col === 'focalizacion') return p.focalizacion || 'N/A';
    if (col === 'estado') return calcularEstadoProyecto(p);
    if (col === 'fechaInicio' || col === 'fechaFin') {
      const fechas = calcularFechasProyecto(p);
      return col === 'fechaInicio' ? formatearFecha(fechas.fechaInicio) : formatearFecha(fechas.fechaFin);
    }
    return (p as any)[col];
  };

  const getSortValue = (col: string, p: Project): number | string => {
    if (col === 'reuniones') {
      return p.reunionesTotales ? p.reunionesHechas / p.reunionesTotales : 0;
    }
    if (col === 'avanceGantt') return p.avanceGantt;
    if (col === 'presupuestoUsado') {
      // Ordenar por porcentaje de presupuesto usado (lo que se muestra en la tabla)
      return p.presupuestoTotal ? (p.presupuestoUsado / p.presupuestoTotal) * 100 : 0;
    }
    if (col === 'focalizacion') return p.focalizacion || 'N/A';
    if (col === 'estado') {
      const estado = calcularEstadoProyecto(p);
      // Ordenar: Finalizado = 3, En Ejecución = 2, Atrasado = 1
      if (estado === 'Finalizado') return 3;
      if (estado === 'En Ejecución') return 2;
      return 1;
    }
    if (col === 'fechaInicio' || col === 'fechaFin') {
      const fechas = calcularFechasProyecto(p);
      const fecha = col === 'fechaInicio' ? fechas.fechaInicio : fechas.fechaFin;
      return fecha ? new Date(fecha).getTime() : 0;
    }
    return (p as any)[col];
  };

  // ====== Funciones helper para estado y fechas ======
  /**
   * Calcula el estado del proyecto:
   * - "Finalizado": avanceGantt === 100 y objetivos === 100 y no hay actividades atrasadas
   * - "Atrasado": hay al menos una tarea con fecha de finalización pasada pero progress < 100
   * - "En Ejecución": no está finalizado y no hay actividades atrasadas
   */
  const calcularEstadoProyecto = (p: Project): 'Finalizado' | 'En Ejecución' | 'Atrasado' => {
    // Verificar si está completamente finalizado
    const estaFinalizado = p.avanceGantt === 100 && p.objetivos === 100;

    // Verificar si hay tareas atrasadas
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const tieneTareasAtrasadas = p.activities?.some(activity =>
      activity.tasks?.some(task => {
        if (!task.endDate) return false;
        const fechaFin = new Date(task.endDate);
        fechaFin.setHours(0, 0, 0, 0);
        // Tarea atrasada: fecha de fin pasada y progress < 100
        return fechaFin < hoy && task.progress < 100;
      })
    ) || false;

    if (tieneTareasAtrasadas) {
      return 'Atrasado';
    }
    
    if (estaFinalizado) {
      return 'Finalizado';
    }
    
    return 'En Ejecución';
  };

  /**
   * Calcula la fecha de inicio y fin del proyecto basándose en las tareas
   * Retorna las fechas mínima (inicio) y máxima (fin) de todas las tareas
   */
  const calcularFechasProyecto = (p: Project): { fechaInicio: string | null; fechaFin: string | null } => {
    const todasLasTareas = p.activities?.flatMap(activity => activity.tasks || []) || [];
    
    if (todasLasTareas.length === 0) {
      return { fechaInicio: null, fechaFin: null };
    }

    const fechasInicio = todasLasTareas
      .map(t => t.startDate)
      .filter(Boolean)
      .map(fecha => new Date(fecha));
    
    const fechasFin = todasLasTareas
      .map(t => t.endDate)
      .filter(Boolean)
      .map(fecha => new Date(fecha));

    if (fechasInicio.length === 0 || fechasFin.length === 0) {
      return { fechaInicio: null, fechaFin: null };
    }

    const fechaInicio = new Date(Math.min(...fechasInicio.map(d => d.getTime())));
    const fechaFin = new Date(Math.max(...fechasFin.map(d => d.getTime())));

    return {
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0],
    };
  };

  /**
   * Formatea una fecha al formato "01.01.2026"
   */
  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      return `${dia}.${mes}.${año}`;
    } catch {
      return 'N/A';
    }
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
    const excelData = filteredData.map((project) => {
      const estado = calcularEstadoProyecto(project);
      const fechas = calcularFechasProyecto(project);
      
      return {
        'Nombre del Proyecto': project.proyecto,
        Estado: estado,
        'Fecha Inicio': formatearFecha(fechas.fechaInicio),
        'Fecha Fin': formatearFecha(fechas.fechaFin),
        Fondo: project.fondo,
        Sede: project.sede,
        'Escuela Líder': project.escuelas?.[0]?.escuela.nombre || 'N/A',
        Foco: project.focalizacion || 'N/A',
        'Avance Gantt (%)': project.avanceGantt,
        'Var. Gantt (%)': project.variacionGantt,
        'Indicadores (%)': project.objetivos,
        'Var. Indicadores (%)': project.variacionObjetivos,
        'Presupuesto (%)': project.presupuestoTotal
          ? Math.min(100, Math.round((project.presupuestoUsado / project.presupuestoTotal) * 100))
          : 0,
        'Presupuesto Usado': project.presupuestoUsado,
        'Presupuesto Total': project.presupuestoTotal,
        'Reuniones Realizadas': project.reunionesHechas,
        'Reuniones Totales': project.reunionesTotales,
        Participantes: project.participantes_rel?.length || 0,
      };
    });

    // Crear el libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar el ancho de las columnas
    const colWidths = [
      { wch: 50 }, // Nombre del Proyecto
      { wch: 15 }, // Estado
      { wch: 15 }, // Fecha Inicio
      { wch: 15 }, // Fecha Fin
      { wch: 15 }, // Fondo
      { wch: 20 }, // Sede
      { wch: 30 }, // Escuela Líder
      { wch: 12 }, // Foco
      { wch: 15 }, // Avance Gantt
      { wch: 12 }, // Var. Gantt
      { wch: 15 }, // Indicadores
      { wch: 15 }, // Var. Indicadores
      { wch: 15 }, // Presupuesto (%)
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
    <TableHead className={`${className} whitespace-nowrap`}>
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

  // Cálculos adicionales para proyectos terminados y en ejecución
  const proyectosTerminados = proyectosIniciales.filter((p) => p.avanceGantt === 100).length;
  const proyectosEnEjecucion = totalProyectos - proyectosTerminados;
  const porcentajePresupuestoUsado = presupuestoTotal > 0 
    ? Math.round((presupuestoUsado / presupuestoTotal) * 100) 
    : 0;
  const presupuestoDisponible = presupuestoTotal - presupuestoUsado;

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
        label === 'Productiva'
          ? '#3b82f6' // Azul
          : label === 'Social'
            ? '#eab308' // Amarillo
            : label === 'Ambiental'
              ? '#10b981' // Verde esmeralda
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

  // Desglose de participantes por rol en orden específico
  const desgloseParticipantes = useMemo(() => {
    const roles = ['Encargado', 'Coordinador', 'Colaborador', 'Docente', 'Estudiante', 'Beneficiario'];
    const grouped: Record<string, number> = {};
    proyectosIniciales.forEach((p) => {
      p.participantes_rel?.forEach((participante) => {
        const rol = participante.rol;
        grouped[rol] = (grouped[rol] || 0) + 1;
      });
    });
    return roles.map(rol => ({
      rol,
      cantidad: grouped[rol] || 0,
    }));
  }, [proyectosIniciales]);

  // ====== Renderizado de Tabla ======
  const renderTable = () => (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full" style={{ maxWidth: '100%' }}>
          <div style={{ minWidth: '2280px' }}>
            <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                {renderHeadWithButton(
                  'Nombre del proyecto',
                  'proyecto',
                  'pl-7 w-[400px] sticky left-0 z-10 bg-gray-100',
                  'start'
                )}
                {renderHeadWithButton(
                  'Estado',
                  'estado',
                  'text-center w-[130px] px-4'
                )}
                {renderHeadWithButton(
                  'Fecha Inicio',
                  'fechaInicio',
                  'text-center w-[140px] px-4'
                )}
                {renderHeadWithButton(
                  'Fecha Fin',
                  'fechaFin',
                  'text-center w-[140px] px-4'
                )}
                {renderHeadWithButton(
                  'Fondo',
                  'fondo',
                  'text-center w-[120px] px-4'
                )}
              {renderHeadWithButton('Sede', 'sede', 'text-center w-[120px] px-4')}
              {renderHeadWithButton(
                'Escuela líder',
                'escuela',
                'text-center w-[200px] px-4'
              )}
              {renderHeadWithButton(
                'Foco',
                'focalizacion',
                'text-center w-[120px] px-4'
              )}
              {renderHeadWithButton(
                'Avance Gantt',
                'avanceGantt',
                'text-center w-[180px] px-4'
              )}
              {renderHeadWithButton(
                'Var. Gantt',
                'variacionGantt',
                'text-center w-[90px] px-2'
              )}
              {renderHeadWithButton(
                'Indicadores',
                'objetivos',
                'text-center w-[180px] px-4'
              )}
              {renderHeadWithButton(
                'Var. Ind.',
                'variacionObjetivos',
                'text-center w-[90px] px-2'
              )}
              {renderHeadWithButton(
                'Presupuesto',
                'presupuestoUsado',
                'text-center w-[180px] px-4'
              )}
              {renderHeadWithButton(
                'Reuniones',
                'reuniones',
                'text-center w-[110px] px-4'
              )}
              {renderHeadWithButton(
                'Participantes',
                'participantes',
                'text-center w-[120px] px-4'
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((p, i) => {
              const estado = calcularEstadoProyecto(p);
              const fechas = calcularFechasProyecto(p);
              
              return (
              <TableRow key={i} className="group">
                <TableCell
                  className="font-medium pl-7 sticky left-0 z-10 bg-white group-hover:bg-muted/50 whitespace-nowrap overflow-hidden text-ellipsis"
                  title={p.proyecto}
                  style={{ maxWidth: '400px' }}
                >
                  {p.proyecto.length > 51
                    ? `${p.proyecto.slice(0, 51)}...`
                    : p.proyecto}
                </TableCell>
                <TableCell className="text-center px-4" style={{ width: '130px', minWidth: '130px' }}>
                  <Badge
                    variant="outline"
                    className={`whitespace-nowrap ${
                      estado === 'Finalizado'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : estado === 'Atrasado'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-blue-100 text-blue-700 border-blue-300'
                    }`}
                  >
                    {estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm px-4 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>
                  {formatearFecha(fechas.fechaInicio)}
                </TableCell>
                <TableCell className="text-center text-sm px-4 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>
                  {formatearFecha(fechas.fechaFin)}
                </TableCell>
                <TableCell className="text-center px-4" style={{ width: '120px', minWidth: '120px' }}>
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.fondo}
                  </Badge>
                </TableCell>
                <TableCell className="text-center px-4" style={{ width: '120px', minWidth: '120px' }}>
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.sede}
                  </Badge>
                </TableCell>
                <TableCell className="text-center px-4 whitespace-nowrap" style={{ width: '200px', minWidth: '200px' }}>
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.escuelas?.[0]?.escuela.nombre || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center px-4" style={{ width: '120px', minWidth: '120px' }}>
                  <Badge
                    variant="outline"
                    className="text-gray-600 whitespace-nowrap"
                  >
                    {p.focalizacion || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="px-4" style={{ width: '180px', minWidth: '180px' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded h-3 relative min-w-[80px]">
                      <div
                        className="bg-emerald-500 h-3 rounded"
                        style={{ width: `${p.avanceGantt}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-800 whitespace-nowrap">
                      {p.avanceGantt}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center px-2" style={{ width: '90px', minWidth: '90px' }}>
                  <span className={`text-sm font-medium ${
                    p.variacionGantt > 0 ? 'text-emerald-600' : 
                    p.variacionGantt < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {p.variacionGantt > 0 ? '+' : ''}{p.variacionGantt}%
                  </span>
                </TableCell>
                <TableCell className="px-4" style={{ width: '180px', minWidth: '180px' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded h-3 relative min-w-[80px]">
                      <div
                        className="bg-emerald-500 h-3 rounded"
                        style={{ width: `${p.objetivos}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-800 whitespace-nowrap">
                      {p.objetivos}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center px-2" style={{ width: '90px', minWidth: '90px' }}>
                  <span className={`text-sm font-medium ${
                    p.variacionObjetivos > 0 ? 'text-emerald-600' : 
                    p.variacionObjetivos < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {p.variacionObjetivos > 0 ? '+' : ''}{p.variacionObjetivos}%
                  </span>
                </TableCell>
                <TableCell className="px-4" style={{ width: '180px', minWidth: '180px' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded h-3 relative min-w-[80px]">
                      <div
                        className="bg-emerald-500 h-3 rounded"
                        style={{
                          width: `${p.presupuestoTotal
                            ? Math.min(100, Math.round((p.presupuestoUsado / p.presupuestoTotal) * 100))
                            : 0}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-800 whitespace-nowrap">
                      {p.presupuestoTotal
                        ? `${Math.min(100, Math.round((p.presupuestoUsado / p.presupuestoTotal) * 100))}%`
                        : '0%'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center px-4 whitespace-nowrap" style={{ width: '110px', minWidth: '110px' }}>
                  {p.reunionesHechas}/{p.reunionesTotales}
                </TableCell>
                <TableCell className="text-center px-4 whitespace-nowrap" style={{ width: '120px', minWidth: '120px' }}>
                  {p.participantes_rel?.length || 0}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );


  // Valores únicos para filtros - basados en TODOS los proyectos (no filtrados)
  // Esto evita que las opciones cambien mientras el usuario está filtrando
  const fondosUnicos = useMemo(() => {
    if (loading) return [];
    return Array.from(new Set(proyectosIniciales.map(p => p.fondo))).sort();
  }, [proyectosIniciales, loading]);

  const sedesUnicas = useMemo(() => {
    if (loading) return [];
    return Array.from(new Set(proyectosIniciales.map(p => p.sede))).sort();
  }, [proyectosIniciales, loading]);

  const escuelasUnicas = useMemo(() => {
    if (loading) return [];
    const escuelas = new Set<string>();
    proyectosIniciales.forEach(p => {
      p.escuelas?.forEach(e => escuelas.add(e.escuela.nombre));
    });
    return Array.from(escuelas).sort();
  }, [proyectosIniciales, loading]);

  const carrerasUnicas = useMemo(() => {
    if (loading) return [];
    const carreras = new Set<string>();
    proyectosIniciales.forEach(p => {
      p.carreras?.forEach(c => carreras.add(c.carrera.nombre));
    });
    return Array.from(carreras).sort();
  }, [proyectosIniciales, loading]);

  const focalizacionesUnicas = useMemo(() => {
    if (loading) return [];
    return Array.from(
      new Set(proyectosIniciales.map(p => p.focalizacion || 'N/A'))
    ).filter(Boolean).sort();
  }, [proyectosIniciales, loading]);

  // ====== Vista: Mirada General ======
  const VistaMiradaGeneral = () => {
    // Preparar datos para el gráfico de sede/escuela con color gris más oscuro
    const datosGraficoSedeEscuela = useMemo(() => {
      const datos = graficoSedeEscuela === 'sede' ? proyectosPorSede : proyectosPorEscuela.slice(0, 10);
      return datos.map(item => ({
        ...item,
        color: '#6b7280', // Gris más oscuro (gray-500)
      }));
    }, [graficoSedeEscuela, proyectosPorSede, proyectosPorEscuela]);

    return (
      <div className="space-y-6">
        {/* Primera fila: Tarjetas de Total Proyectos y Total Participantes (mismo tamaño) */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FolderKanban className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Total Proyectos</h3>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-4">{totalProyectos}</div>
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Terminados</p>
                  <p className="text-xl font-semibold text-emerald-600">{proyectosTerminados}</p>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">En Ejecución</p>
                  <p className="text-xl font-semibold text-blue-600">{proyectosEnEjecucion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta de Total Participantes (mismo tamaño) */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Total Participantes</h3>
              </div>
              <div className="text-5xl font-bold text-gray-900 mb-4">{totalParticipantes}</div>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                {desgloseParticipantes.map(({ rol, cantidad }, index) => (
                  <div key={rol} className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 capitalize">{rol}</p>
                      <p className="text-xl font-semibold text-gray-900">{cantidad}</p>
                    </div>
                    {index < desgloseParticipantes.length - 1 && (
                      <div className="h-12 w-px bg-gray-300 flex-shrink-0"></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila: Tres tarjetas separadas para Avance, Objetivos y Presupuesto */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <LineChart className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Avance Promedio Gantt</h3>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{avancePromedio}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${avancePromedio}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">% Objetivos Cumplidos</h3>
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{indicadoresPromedio}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${indicadoresPromedio}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Presupuesto Usado</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    ${(presupuestoUsado / 1000000).toFixed(1)}M
                  </span>
                  <span className="text-xl font-bold text-gray-400">
                    de ${(presupuestoTotal / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${porcentajePresupuestoUsado}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{porcentajePresupuestoUsado}% utilizado</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tercera fila: Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico de Sede/Escuela (Cuarta prioridad) */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {graficoSedeEscuela === 'sede' ? (
                    <Building2 className="h-5 w-5 text-gray-600" />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {graficoSedeEscuela === 'sede' ? 'Distribución de Proyectos por Sede' : 'Distribución de Proyectos por Escuela'}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGraficoSedeEscuela(graficoSedeEscuela === 'sede' ? 'escuela' : 'sede')}
                  className="text-xs"
                >
                  {graficoSedeEscuela === 'sede' ? 'Ver por Escuela' : 'Ver por Sede'}
                </Button>
              </div>
              <SimpleBarChart
                data={datosGraficoSedeEscuela}
                height={250}
              />
            </CardContent>
          </Card>

          {/* Gráfico de Focalización (Última prioridad) */}
          <Card className="shadow-lg">
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Proyectos por Focalización</h3>
              </div>
              <div className="flex-1 flex items-center">
                <SimpleDonutChart
                  data={proyectosPorFocalizacion}
                  size={180}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

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
      {currentView === 'lista' && (
        <div className="space-y-6 w-full">
          {/* Panel de Filtros - Inline para evitar re-mount */}
          <div className="pt-6 mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Filtro de Nombre de Proyecto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre de Proyecto
                </label>
                <Input
                  placeholder="Buscar proyecto..."
                  value={nombreProyectoFilter}
                  onChange={(e) => setNombreProyectoFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtro de Fondo */}
              <SimpleMultiSelect
                label="Fondo"
                filterKey="fondo"
                options={fondosUnicos}
                placeholder="Todos los fondos"
                selectedValues={selectedFondos}
                onSelectionChange={handleFilterSelectionChange}
              />

              {/* Filtro de Sede */}
              <SimpleMultiSelect
                label="Sede"
                filterKey="sede"
                options={sedesUnicas}
                placeholder="Todas las sedes"
                selectedValues={selectedSedes}
                onSelectionChange={handleFilterSelectionChange}
              />

              {/* Filtro de Escuela Líder */}
              <SimpleMultiSelect
                label="Escuela Líder"
                filterKey="escuela"
                options={escuelasUnicas}
                placeholder="Todas las escuelas"
                selectedValues={selectedEscuelas}
                onSelectionChange={handleFilterSelectionChange}
              />

              {/* Filtro de Carrera */}
              <SimpleMultiSelect
                label="Carrera"
                filterKey="carrera"
                options={carrerasUnicas}
                placeholder="Todas las carreras"
                selectedValues={selectedCarreras}
                onSelectionChange={handleFilterSelectionChange}
              />

              {/* Filtro de Foco */}
              <SimpleMultiSelect
                label="Foco"
                filterKey="focalizacion"
                options={focalizacionesUnicas}
                placeholder="Todos los focos"
                selectedValues={selectedFocos}
                onSelectionChange={handleFilterSelectionChange}
              />
            </div>

            {/* Botón para limpiar filtros */}
            {(nombreProyectoFilter ||
              filters.fondo?.length ||
              filters.sede?.length ||
              filters.escuela?.length ||
              filters.carrera?.length ||
              filters.focalizacion?.length) && (
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
      )}
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
