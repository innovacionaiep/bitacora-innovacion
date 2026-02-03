'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getHistorialProyecto,
  getHistorialFiltros,
} from '@/lib/actions/historial';
import { History, Filter } from 'lucide-react';

interface HistorialCardProps {
  projectId: string;
}

interface HistorialEntry {
  id: string;
  fecha: Date | string;
  accion: string;
  tabProyecto: string;
  elementoEspecifico: string;
  cambioGenerado: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function HistorialCard({ projectId }: HistorialCardProps) {
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    personaId: 'all',
    accion: 'all',
    tabProyecto: 'all',
  });
  const [opcionesFiltros, setOpcionesFiltros] = useState({
    personas: [] as Array<{ id: string; name: string | null; email: string }>,
    acciones: [] as string[],
    tabs: [] as string[],
  });

  useEffect(() => {
    loadHistorial();
    loadFiltros();
  }, [projectId, filtros]);

  const loadHistorial = async () => {
    setLoading(true);
    try {
      const result = await getHistorialProyecto(projectId, {
        personaId: filtros.personaId !== 'all' ? filtros.personaId : undefined,
        accion: filtros.accion !== 'all' ? filtros.accion : undefined,
        tabProyecto:
          filtros.tabProyecto !== 'all' ? filtros.tabProyecto : undefined,
      });

      if (result.success && result.data) {
        setHistorial(result.data);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFiltros = async () => {
    try {
      const result = await getHistorialFiltros(projectId);
      if (result.success && result.data) {
        setOpcionesFiltros(result.data);
      }
    } catch (error) {
      console.error('Error al cargar filtros:', error);
    }
  };

  const formatFecha = (fecha: Date | string) => {
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatResumen = (entry: HistorialEntry) => {
    const persona =
      entry.user.name || entry.user.email || 'Usuario desconocido';
    const avatar = entry.user.image;

    // Conjugar verbos
    const conjugaciones: Record<string, string> = {
      Crear: 'creado',
      Comentar: 'comentado',
      Actualizar: 'actualizado',
      'Marcar realizada': 'marcado realizada',
    };
    const accionConjugada =
      conjugaciones[entry.accion] || entry.accion.toLowerCase();

    const tabTexto = entry.tabProyecto;

    // Extraer el nombre del elemento específico
    let elementoNombre: React.ReactNode = entry.elementoEspecifico;

    // Si contiene "Tarea " con formato: Tarea "nombre" de Actividad "actividad"
    if (
      entry.elementoEspecifico.includes('Tarea "') &&
      entry.elementoEspecifico.includes(' de Actividad "')
    ) {
      const match = entry.elementoEspecifico.match(
        /Tarea "([^"]+)" de Actividad "([^"]+)"/
      );
      if (match) {
        const [, tareaNombre, actividadNombre] = match;
        elementoNombre = (
          <>
            la tarea{' '}
            <strong>
              <em>{tareaNombre}</em>
            </strong>{' '}
            de la actividad{' '}
            <strong>
              <em>{actividadNombre}</em>
            </strong>
          </>
        );
      }
    } else if (entry.elementoEspecifico.includes('Tarea "')) {
      // Solo tarea sin actividad
      const tareaMatch = entry.elementoEspecifico.match(/Tarea "([^"]+)"/);
      if (tareaMatch) {
        elementoNombre = (
          <>
            la tarea{' '}
            <strong>
              <em>{tareaMatch[1]}</em>
            </strong>
          </>
        );
      }
    } else if (entry.elementoEspecifico.includes('Indicador "')) {
      const indicadorMatch =
        entry.elementoEspecifico.match(/Indicador "([^"]+)"/);
      if (indicadorMatch) {
        elementoNombre = (
          <>
            el indicador{' '}
            <strong>
              <em>{indicadorMatch[1]}</em>
            </strong>
          </>
        );
      }
    } else if (entry.elementoEspecifico.includes('Actividad "')) {
      const actividadMatch =
        entry.elementoEspecifico.match(/Actividad "([^"]+)"/);
      if (actividadMatch) {
        elementoNombre = (
          <>
            la actividad{' '}
            <strong>
              <em>{actividadMatch[1]}</em>
            </strong>
          </>
        );
      }
    } else {
      // Si no tiene formato conocido, usar tal cual pero en negrita
      elementoNombre = <strong>{entry.elementoEspecifico}</strong>;
    }

    // Determinar si mostrar cambioGenerado (no para "Marcar realizada")
    const mostrarCambio =
      entry.accion !== 'Marcar realizada' &&
      entry.cambioGenerado &&
      entry.cambioGenerado.trim() !== '';

    return (
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={persona}
            className="h-8 w-8 rounded-full flex-shrink-0 ring-2 ring-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 ring-2 ring-gray-200">
            <span className="text-xs text-gray-600 font-medium">
              {(persona.charAt(0) || 'U').toUpperCase()}
            </span>
          </div>
        )}

        {/* Texto del resumen */}
        <div className="flex-1">
          <strong>{persona}</strong> ha{' '}
          <strong className="text-red-600">{accionConjugada}</strong> en{' '}
          <strong className="text-emerald-600">{tabTexto}</strong>{' '}
          {elementoNombre}
          {mostrarCambio && (
            <>
              : {'"'}
              <span className="text-blue-600">{entry.cambioGenerado}</span>
              {'"'}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full shadow-md flex flex-col">
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <History className="h-5 w-5 text-emerald-600" />
            Historial del Proyecto
          </CardTitle>
        </div>

        {/* Filtros */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros:</span>
          </div>

          <Select
            value={filtros.personaId}
            onValueChange={(value) =>
              setFiltros((prev) => ({ ...prev, personaId: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las personas</SelectItem>
              {opcionesFiltros.personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  {persona.name || persona.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtros.accion}
            onValueChange={(value) =>
              setFiltros((prev) => ({ ...prev, accion: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              {opcionesFiltros.acciones.map((accion) => (
                <SelectItem key={accion} value={accion}>
                  {accion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtros.tabProyecto}
            onValueChange={(value) =>
              setFiltros((prev) => ({ ...prev, tabProyecto: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tab del proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tabs</SelectItem>
              {opcionesFiltros.tabs.map((tab) => (
                <SelectItem key={tab} value={tab}>
                  {tab}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando historial...</p>
            </div>
          </div>
        ) : historial.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <History className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-base">No hay registros en el historial</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historial.map((entry) => (
              <div
                key={entry.id}
                className="border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
              >
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="text-sm text-gray-600 font-medium">
                    {formatFecha(entry.fecha)}
                  </div>
                  <div className="text-gray-800 leading-relaxed">
                    {formatResumen(entry)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
