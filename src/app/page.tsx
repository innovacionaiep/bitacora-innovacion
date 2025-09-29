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
  Download
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useProyectos } from '@/hooks/useProyectos';

type Project = {
  id: string;
  proyecto: string;
  fondo: string;
  sede: string;
  escuela: string;
  avance_gantt: number;
  objetivos: number;
  presupuesto_usado: number;
  presupuesto_total: number;
  reuniones_hechas: number;
  reuniones_totales: number;
  participantes: number;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  // Usar el hook de Supabase en lugar de datos hardcodeados
  const { proyectos: proyectosIniciales, loading, error } = useProyectos();

  // ====== Estados ======
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});
  const [searchTerm, setSearchTerm] = useState<{ [key: string]: string }>({});
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });


  // ====== Accesores de columna (mostrar / filtrar / ordenar) ======
  const getDisplayValue = (col: string, p: Project): string | number => {
    if (col === 'reuniones') return `${p.reuniones_hechas}/${p.reuniones_totales}`;
    if (col === 'avanceGantt') return p.avance_gantt;
    if (col === 'presupuestoUsado') return p.presupuesto_usado;
    return (p as any)[col];
  };

  const getSortValue = (col: string, p: Project): number | string => {
    if (col === 'reuniones') {
      return p.reuniones_totales ? p.reuniones_hechas / p.reuniones_totales : 0;
    }
    if (col === 'avanceGantt') return p.avance_gantt;
    if (col === 'presupuestoUsado') return p.presupuesto_usado;
    return (p as any)[col];
  };

  // Proyectos filtrados con TODOS los filtros aplicados
  const getFilteredProjects = () => {
    if (loading) return [];
    const filtered = proyectosIniciales.filter((p) =>
      Object.entries(filters).every(([col, selected]) => {
        if (!selected || selected.length === 0) return true;
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
  };

  // Valores únicos DINÁMICOS para la columna abierta (excluye su propio filtro)
  const getUniqueValues = (columna: keyof Project | 'reuniones') => {
    if (loading) return [];
    const rows = proyectosIniciales.filter((p) =>
      Object.entries(filters).every(([col, selected]) => {
        if (col === columna) return true; // ignorar su propio filtro
        if (!selected || selected.length === 0) return true;
        const val = String(getDisplayValue(col, p));
        return selected.includes(val);
      })
    );
    return Array.from(new Set(rows.map((p) => getDisplayValue(columna as string, p))));
  };

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
    const filteredData = getFilteredProjects();
    
    // Preparar los datos para Excel
    const excelData = filteredData.map(project => ({
      'Nombre del Proyecto': project.proyecto,
      'Fondo': project.fondo,
      'Sede': project.sede,
      'Escuela Líder': project.escuela,
      'Avance Gantt (%)': project.avance_gantt,
      'Indicadores (%)': project.objetivos,
      'Presupuesto Usado': project.presupuesto_usado,
      'Presupuesto Total': project.presupuesto_total,
      'Reuniones Realizadas': project.reuniones_hechas,
      'Reuniones Totales': project.reuniones_totales,
      'Participantes': project.participantes
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
      { wch: 15 }  // Participantes
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
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{titulo}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAction(columna, 'Ordenar ASC')}>Ordenar ASC</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(columna, 'Ordenar DESC')}>Ordenar DESC</DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Filtrar</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 p-2">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full border rounded px-2 py-1 text-sm mb-2"
                  value={searchTerm[columna] || ''}
                  onChange={(e) => setSearchTerm({ ...searchTerm, [columna]: e.target.value })}
                />

                <div className="max-h-48 overflow-y-auto pr-1">
                  {getUniqueValues(columna as any)
                    .filter((val) =>
                      String(val).toLowerCase().includes((searchTerm[columna] || '').toLowerCase())
                    )
                    .map((val) => (
                      <label key={`${columna}-${val}`} className="flex items-center gap-2 text-sm py-1">
                        <input
                          type="checkbox"
                          checked={filters[columna]?.includes(String(val)) || false}
                          onChange={(e) => {
                            const newFilters = { ...filters };
                            const v = String(val);
                            if (e.target.checked) {
                              newFilters[columna] = [...(newFilters[columna] || []), v];
                            } else {
                              newFilters[columna] = newFilters[columna]?.filter((f) => f !== v) || [];
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

  // Calcular métricas dinámicas
  const totalProyectos = proyectosIniciales.length;
  const avancePromedio = totalProyectos > 0 ? Math.round(proyectosIniciales.reduce((sum, p) => sum + p.avance_gantt, 0) / totalProyectos) : 0;
  const indicadoresPromedio = totalProyectos > 0 ? Math.round(proyectosIniciales.reduce((sum, p) => sum + p.objetivos, 0) / totalProyectos) : 0;
  const presupuestoUsado = proyectosIniciales.reduce((sum, p) => sum + p.presupuesto_usado, 0);
  const presupuestoTotal = proyectosIniciales.reduce((sum, p) => sum + p.presupuesto_total, 0);
  const reunionesRealizadas = proyectosIniciales.reduce((sum, p) => sum + p.reuniones_hechas, 0);
  const totalParticipantes = proyectosIniciales.reduce((sum, p) => sum + p.participantes, 0);

  if (loading) {
    return (
      <div className="space-y-6 w-full">
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
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error al cargar los proyectos: {error}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Botón de exportar */}
      <div className="flex items-center justify-end w-full">
        <Button 
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Excel</span>
        </Button>
      </div>

      {/* Grid con cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Proyectos activos</p>
                <div className="text-2xl font-bold">{totalProyectos}</div>
                <p className="text-xs text-muted-foreground">Proyectos en la base de datos</p>
              </div>
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avance promedio</p>
                <div className="text-2xl font-bold">{avancePromedio}%</div>
                <p className="text-xs text-muted-foreground">Avance promedio de las cartas Gantt</p>
              </div>
              <LineChart className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Indicadores</p>
                <div className="text-2xl font-bold">{indicadoresPromedio}%</div>
                <p className="text-xs text-muted-foreground">Objetivos cumplidos</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Presupuesto usado</p>
                <div className="text-2xl font-bold">${(presupuestoUsado / 1000000).toFixed(1)}M</div>
                <p className="text-xs text-muted-foreground">de ${(presupuestoTotal / 1000000).toFixed(1)}M disponibles</p>
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
                <p className="text-xs text-muted-foreground">Asociadas al seguimiento</p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Participantes</p>
                <div className="text-2xl font-bold">{totalParticipantes}</div>
                <p className="text-xs text-muted-foreground">Miembros activos en proyectos</p>
              </div>
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de proyectos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                {renderHeadWithButton("Nombre del proyecto", "proyecto", "pl-7 w-[400px]", "start")}
                {renderHeadWithButton("Fondo", "fondo", "text-center w-[100px]")}
                {renderHeadWithButton("Sede", "sede", "text-center w-[100px]")}
                {renderHeadWithButton("Escuela líder", "escuela", "text-center w-[150px]")}
                {renderHeadWithButton("Avance Gantt", "avanceGantt", "text-center w-40")}
                {renderHeadWithButton("Indicadores", "objetivos", "text-center w-40")}
                {renderHeadWithButton("Presupuesto", "presupuestoUsado", "pl-8 text-center w-30")}
                {renderHeadWithButton("Reuniones", "reuniones", "text-center w-28")}
                {renderHeadWithButton("Participantes", "participantes", "text-center w-28")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredProjects().map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium pl-7">{p.proyecto}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-gray-600 whitespace-nowrap">{p.fondo}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-gray-600 whitespace-nowrap">{p.sede}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-gray-600 whitespace-nowrap">{p.escuela}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded h-3 relative">
                        <div className="bg-green-500 h-3 rounded" style={{ width: `${p.avance_gantt}%` }}></div>
                      </div>
                      <span className="text-xs text-black ml-2">{p.avance_gantt}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded h-3 relative">
                        <div className="bg-green-500 h-3 rounded" style={{ width: `${p.objetivos}%` }}></div>
                      </div>
                      <span className="text-xs text-black ml-2">{p.objetivos}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="pl-8 text-center">
                    <span className="font-bold">${p.presupuesto_usado.toLocaleString("es-CL")}</span><br />
                    <span className="text-gray-500">de ${p.presupuesto_total.toLocaleString("es-CL")}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.reuniones_hechas}/{p.reuniones_totales}
                  </TableCell>
                  <TableCell className="text-center">{p.participantes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <Button>Crear nuevo proyecto</Button>
      </div>
    </div>
  );
}
