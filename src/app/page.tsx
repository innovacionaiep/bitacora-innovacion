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
  ChevronDown
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

type Project = {
  proyecto: string;
  fondo: string;
  sede: string;
  escuela: string;
  avanceGantt: number;
  objetivos: number;
  presupuestoUsado: number;
  presupuestoTotal: number;
  reunionesHechas: number;
  reunionesTotales: number;
  participantes: number;
};

export default function DashboardPage() {
  const proyectosIniciales: Project[] = [
    { proyecto: "AntofaSuena 2025. Música-Industria-Territorio", fondo: "IMPULSA", sede: "Antofagasta", escuela: "Artes e Industrias Creativas", avanceGantt: 70, objetivos: 80, presupuestoUsado: 1650000, presupuestoTotal: 2000000, reunionesHechas: 3, reunionesTotales: 5, participantes: 24 },
    { proyecto: "Laboratorio de Innovación Gastronómico", fondo: "IMPULSA", sede: "Barrio Universitario", escuela: "Gastronomía, Hotelería y Turismo", avanceGantt: 65, objetivos: 75, presupuestoUsado: 800000, presupuestoTotal: 1000000, reunionesHechas: 2, reunionesTotales: 4, participantes: 18 },
    { proyecto: "Aqua Terra: Estética Consciente", fondo: "IMPULSA", sede: "La Serena", escuela: "Estética Integral", avanceGantt: 50, objetivos: 60, presupuestoUsado: 1200000, presupuestoTotal: 2000000, reunionesHechas: 1, reunionesTotales: 3, participantes: 12 },
    { proyecto: "Renacer en Azul", fondo: "IMPULSA", sede: "La Serena", escuela: "Artes e Industrias Creativas", avanceGantt: 80, objetivos: 85, presupuestoUsado: 2200000, presupuestoTotal: 2500000, reunionesHechas: 4, reunionesTotales: 6, participantes: 20 },
    { proyecto: "Upcycling Intercultural", fondo: "IMPULSA", sede: "Los Ángeles", escuela: "Artes e Industrias Creativas", avanceGantt: 55, objetivos: 70, presupuestoUsado: 900000, presupuestoTotal: 1500000, reunionesHechas: 2, reunionesTotales: 5, participantes: 15 },
    { proyecto: "Salud Menstrual como un Derecho Irrenunciable y Sostenible en el tiempo", fondo: "IMPULSA", sede: "Maipú", escuela: "Salud y Deporte", avanceGantt: 60, objetivos: 72, presupuestoUsado: 1000000, presupuestoTotal: 1800000, reunionesHechas: 3, reunionesTotales: 6, participantes: 22 },
    { proyecto: "Simulación Profesional Asistida por IA para el Desarrollo de Competencias Blandas", fondo: "IMPULSA", sede: "Maipú", escuela: "Desarrollo Social y Educación", avanceGantt: 75, objetivos: 82, presupuestoUsado: 1100000, presupuestoTotal: 1700000, reunionesHechas: 4, reunionesTotales: 6, participantes: 25 },
    { proyecto: "Mejoramiento de Invernaderos Sustentables con el uso de Ecomat", fondo: "IMPULSA", sede: "Osorno", escuela: "Ingeniería, Energía y Tecnología", avanceGantt: 55, objetivos: 65, presupuestoUsado: 950000, presupuestoTotal: 1600000, reunionesHechas: 2, reunionesTotales: 5, participantes: 19 },
    { proyecto: "Hidrocrin (Impulsa)", fondo: "IMPULSA", sede: "Puerto Montt", escuela: "Estética Integral", avanceGantt: 68, objetivos: 78, presupuestoUsado: 1200000, presupuestoTotal: 2000000, reunionesHechas: 3, reunionesTotales: 6, participantes: 21 },
    { proyecto: "Conoce los Encantos de Chiloé", fondo: "IMPULSA", sede: "Puerto Montt", escuela: "Artes e Industrias Creativas", avanceGantt: 72, objetivos: 80, presupuestoUsado: 1500000, presupuestoTotal: 2200000, reunionesHechas: 4, reunionesTotales: 7, participantes: 30 },
    { proyecto: "Festival del Futuro: Encuentro Sostenible", fondo: "IMPULSA", sede: "Rancagua", escuela: "Artes e Industrias Creativas", avanceGantt: 85, objetivos: 90, presupuestoUsado: 2000000, presupuestoTotal: 3000000, reunionesHechas: 5, reunionesTotales: 8, participantes: 40 },
    { proyecto: "Ruta Patrimonial BIM para Cartagena", fondo: "IMPULSA", sede: "San Antonio", escuela: "Ingeniería, Energía y Tecnología", avanceGantt: 62, objetivos: 70, presupuestoUsado: 1300000, presupuestoTotal: 2100000, reunionesHechas: 3, reunionesTotales: 6, participantes: 28 },
    { proyecto: "TechLakou: Alfabetización digital y emprendimiento tecnológico para haitianos", fondo: "IMPULSA", sede: "San Bernardo", escuela: "Administración y Gestión Empresarial", avanceGantt: 58, objetivos: 68, presupuestoUsado: 900000, presupuestoTotal: 1500000, reunionesHechas: 2, reunionesTotales: 5, participantes: 18 },
    { proyecto: "Agua Conecta: Información y Tecnología para la Agricultura Familiar Campesina", fondo: "IMPULSA", sede: "San Felipe", escuela: "Ingeniería, Energía y Tecnología", avanceGantt: 76, objetivos: 83, presupuestoUsado: 1400000, presupuestoTotal: 2300000, reunionesHechas: 4, reunionesTotales: 6, participantes: 33 },
    { proyecto: "Podocaja Inclusiva: Podología Anticipada y Amigable", fondo: "IMPULSA", sede: "San Fernando", escuela: "Salud y Deporte", avanceGantt: 60, objetivos: 74, presupuestoUsado: 1000000, presupuestoTotal: 1700000, reunionesHechas: 3, reunionesTotales: 5, participantes: 20 },
    { proyecto: "Guardianes del Antivero: Monitoreo Comunitario de Humedal y su Agua", fondo: "IMPULSA", sede: "San Fernando", escuela: "Administración y Gestión Empresarial", avanceGantt: 70, objetivos: 79, presupuestoUsado: 1250000, presupuestoTotal: 1900000, reunionesHechas: 3, reunionesTotales: 6, participantes: 26 },
    { proyecto: "Torneo de Emprendimiento Escolar Maule 2.0 2025", fondo: "IMPULSA", sede: "Talca", escuela: "Administración y Gestión Empresarial", avanceGantt: 82, objetivos: 88, presupuestoUsado: 1600000, presupuestoTotal: 2400000, reunionesHechas: 4, reunionesTotales: 7, participantes: 29 },
    { proyecto: "Cuidar la piel es cuidar la vida: mejorando la calidad de la piel en adultos mayores", fondo: "IMPULSA", sede: "Temuco", escuela: "Estética Integral", avanceGantt: 63, objetivos: 72, presupuestoUsado: 1150000, presupuestoTotal: 1700000, reunionesHechas: 3, reunionesTotales: 5, participantes: 22 },
    { proyecto: "Puerto Moda Valparaíso 2.0", fondo: "IMPULSA", sede: "Valparaíso", escuela: "Artes e Industrias Creativas", avanceGantt: 77, objetivos: 85, presupuestoUsado: 1750000, presupuestoTotal: 2600000, reunionesHechas: 4, reunionesTotales: 6, participantes: 31 },
    { proyecto: "EcoFuerza Puchuncaví: Emprendiendo con Resiliencia Climática", fondo: "IMPULSA", sede: "Viña del Mar", escuela: "Administración y Gestión Empresarial", avanceGantt: 69, objetivos: 78, presupuestoUsado: 1300000, presupuestoTotal: 2000000, reunionesHechas: 3, reunionesTotales: 6, participantes: 23 },
  ];

  // ====== Estados ======
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({});
  const [searchTerm, setSearchTerm] = useState<{ [key: string]: string }>({});
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({
    key: null,
    dir: 'asc',
  });

  // ====== Accesores de columna (mostrar / filtrar / ordenar) ======
  const getDisplayValue = (col: string, p: Project): string | number => {
    if (col === 'reuniones') return `${p.reunionesHechas}/${p.reunionesTotales}`;
    return (p as any)[col];
  };

  const getSortValue = (col: string, p: Project): number | string => {
    if (col === 'reuniones') {
      return p.reunionesTotales ? p.reunionesHechas / p.reunionesTotales : 0;
    }
    return (p as any)[col];
  };

  // Proyectos filtrados con TODOS los filtros aplicados
  const getFilteredProjects = () => {
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

  return (
    <div className="space-y-6 w-full">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de avances de los proyectos</p>
      </div>

      {/* Grid con cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Proyectos activos</p>
                <div className="text-2xl font-bold">20</div>
                <p className="text-xs text-muted-foreground">+2 en la última semana</p>
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
                <div className="text-2xl font-bold">72%</div>
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
                <div className="text-2xl font-bold">85%</div>
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
                <div className="text-2xl font-bold">$25.300</div>
                <p className="text-xs text-muted-foreground">de $50.000 disponibles</p>
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
                <div className="text-2xl font-bold">18</div>
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
                <div className="text-2xl font-bold">56</div>
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
                        <div className="bg-green-500 h-3 rounded" style={{ width: `${p.avanceGantt}%` }}></div>
                      </div>
                      <span className="text-xs text-black ml-2">{p.avanceGantt}%</span>
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
                    <span className="font-bold">${p.presupuestoUsado.toLocaleString("es-CL")}</span><br />
                    <span className="text-gray-500">de ${p.presupuestoTotal.toLocaleString("es-CL")}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.reunionesHechas}/{p.reunionesTotales}
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
