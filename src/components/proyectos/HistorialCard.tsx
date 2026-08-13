'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { DateRangeSlider } from '@/components/ui/date-range-slider';
import {
  getHistorialProyecto,
  getHistorialFiltros,
} from '@/lib/actions/historial';
import { History, Filter, CalendarIcon } from 'lucide-react';
import { parse, format, subMonths } from 'date-fns';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { historialKey, historialFiltrosKey } from '@/lib/query-keys';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { historialASegmentos } from '@/lib/historial-mensaje';

interface HistorialCardProps {
  projectId: string;
  topLoaderEnabled?: boolean;
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

export function HistorialCard({
  projectId,
  topLoaderEnabled = true,
}: HistorialCardProps) {
  const [filtros, setFiltros] = useState({
    personaId: 'all',
    accion: 'all',
    tabProyecto: 'all',
    fechaDesde: '',
    fechaHasta: '',
  });
  const [sliderResetKey, setSliderResetKey] = useState(0);

  const toISODate = (str: string): string => {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    try {
      const sep = str.includes('/') ? '/' : '-';
      const fmt = sep === '/' ? 'dd/MM/yyyy' : 'dd-MM-yyyy';
      return format(parse(str, fmt, new Date()), 'yyyy-MM-dd');
    } catch {
      return str;
    }
  };

  const filterParams = useMemo(
    () => ({
      personaId: filtros.personaId !== 'all' ? filtros.personaId : undefined,
      accion: filtros.accion !== 'all' ? filtros.accion : undefined,
      tabProyecto:
        filtros.tabProyecto !== 'all' ? filtros.tabProyecto : undefined,
      fechaDesde: filtros.fechaDesde
        ? toISODate(filtros.fechaDesde)
        : undefined,
      fechaHasta: filtros.fechaHasta
        ? toISODate(filtros.fechaHasta)
        : undefined,
    }),
    [filtros]
  );

  const historialQuery = useQuery({
    queryKey: historialKey(projectId, filterParams),
    queryFn: async () => {
      const result = await getHistorialProyecto(projectId, {
        personaId: filterParams.personaId,
        accion: filterParams.accion,
        tabProyecto: filterParams.tabProyecto,
        fechaDesde: filterParams.fechaDesde,
        fechaHasta: filterParams.fechaHasta,
      });
      if (!result.success) {
        throw new Error(result.error ?? 'Error al cargar historial');
      }
      return (result.data ?? []) as HistorialEntry[];
    },
    staleTime: 30_000,
  });

  const filtrosQuery = useQuery({
    queryKey: historialFiltrosKey(projectId),
    queryFn: async () => {
      const result = await getHistorialFiltros(projectId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Error al cargar filtros');
      }
      return {
        personas: result.data.personas as Array<{
          id: string;
          name: string | null;
          email: string;
        }>,
        acciones: result.data.acciones,
        tabs: result.data.tabs,
        fechaMin: result.data.fechaMin ?? undefined,
        fechaMax: result.data.fechaMax ?? undefined,
      };
    },
    staleTime: 5 * 60_000,
  });

  const historial = historialQuery.data ?? [];
  const loading = historialQuery.isLoading && !historialQuery.data;
  usePageTopLoader(loading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });
  const opcionesFiltros = filtrosQuery.data ?? {
    personas: [] as Array<{ id: string; name: string | null; email: string }>,
    acciones: [] as string[],
    tabs: [] as string[],
    fechaMin: undefined as Date | undefined,
    fechaMax: undefined as Date | undefined,
  };

  const sliderDateRange = useMemo(() => {
    const hoy = new Date();
    const min = opcionesFiltros.fechaMin
      ? new Date(opcionesFiltros.fechaMin)
      : subMonths(hoy, 12);
    const max = opcionesFiltros.fechaMax
      ? new Date(opcionesFiltros.fechaMax)
      : hoy;
    return { min, max };
  }, [opcionesFiltros.fechaMin, opcionesFiltros.fechaMax]);

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
    const segmentos = historialASegmentos({
      persona,
      accion: entry.accion,
      tabProyecto: entry.tabProyecto,
      elementoEspecifico: entry.elementoEspecifico,
      cambioGenerado: entry.cambioGenerado,
    });
    const clasePorRol: Record<string, string> = {
      persona: 'font-medium text-gray-900',
      verbo: 'font-medium text-orange-700',
      tab: 'font-medium text-emerald-700',
      objeto: 'font-medium text-gray-800 not-italic',
      detalle: 'font-medium text-violet-700',
    };

    return (
      <div className="flex items-start gap-2.5">
        <img
          src={DEFAULT_AVATAR}
          alt={persona}
          className="h-7 w-7 rounded-full flex-shrink-0 ring-1 ring-gray-200 object-cover"
        />
        <div className="flex-1">
          {segmentos.map((seg, i) => {
            const clase = clasePorRol[seg.role];
            if (seg.role === 'persona' || seg.role === 'verbo' || seg.role === 'objeto') {
              return (
                <strong key={i} className={clase}>
                  {seg.text}
                </strong>
              );
            }
            if (clase) {
              return (
                <span key={i} className={clase}>
                  {seg.text}
                </span>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
        </div>
      </div>
    );
  };

  const formatDateRangeLabel = () => {
    if (!filtros.fechaDesde && !filtros.fechaHasta) return 'Rango de fechas';
    const fmt = (s: string) => {
      try {
        const iso = toISODate(s);
        if (!iso) return s;
        return format(new Date(iso + 'T00:00:00'), 'dd/MM/yyyy');
      } catch {
        return s;
      }
    };
    if (filtros.fechaDesde && filtros.fechaHasta)
      return `${fmt(filtros.fechaDesde)} - ${fmt(filtros.fechaHasta)}`;
    if (filtros.fechaDesde) return `Desde ${fmt(filtros.fechaDesde)}`;
    if (filtros.fechaHasta) return `Hasta ${fmt(filtros.fechaHasta)}`;
    return 'Rango de fechas';
  };

  const filterTriggerClass =
    'h-9 rounded-md border border-gray-200 bg-white text-[13px] font-medium tracking-wide text-gray-600 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500/40';

  return (
    <Card className="h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none">
      <CardHeader className="px-5 py-3 border-b border-gray-100 bg-gray-50/90 rounded-t-lg space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle
            id="tour-historial-titulo"
            className="flex items-center gap-2 text-[13px] font-medium tracking-wide text-gray-800 shrink-0"
          >
            <History className="h-3.5 w-3.5 text-gray-500" />
            Historial de actualizaciones del proyecto
          </CardTitle>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className="hidden sm:block h-6 w-px bg-gray-200 shrink-0"
              aria-hidden
            />
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros</span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="tour-historial-filtro-fechas"
                  variant="outline"
                  className={`w-[200px] justify-start text-left ${filterTriggerClass}`}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate">{formatDateRangeLabel()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-[320px]" align="end">
                <div className="p-4 space-y-3">
                  <DateRangeSlider
                    key={`slider-${sliderResetKey}`}
                    minDate={sliderDateRange.min}
                    maxDate={sliderDateRange.max}
                    startDate={
                      filtros.fechaDesde ||
                      format(sliderDateRange.min, 'yyyy-MM-dd')
                    }
                    endDate={
                      filtros.fechaHasta ||
                      format(sliderDateRange.max, 'yyyy-MM-dd')
                    }
                    onRangeChange={(start, end) => {
                      setFiltros((prev) => ({
                        ...prev,
                        fechaDesde: start,
                        fechaHasta: end,
                      }));
                    }}
                  />
                  {(filtros.fechaDesde || filtros.fechaHasta) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[13px] text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          fechaDesde: '',
                          fechaHasta: '',
                        }));
                        setSliderResetKey((k) => k + 1);
                      }}
                    >
                      Limpiar filtro de fechas
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select
              value={filtros.personaId}
              onValueChange={(value) =>
                setFiltros((prev) => ({ ...prev, personaId: value }))
              }
            >
              <SelectTrigger
                id="tour-historial-filtro-persona"
                className={`w-[180px] ${filterTriggerClass}`}
              >
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
              <SelectTrigger
                id="tour-historial-filtro-tipo"
                className={`w-[180px] ${filterTriggerClass}`}
              >
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
              <SelectTrigger className={`w-[180px] ${filterTriggerClass}`}>
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
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {loading ? (
          <div className="h-64" />
        ) : historial.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-[13px] text-gray-400">
              No hay registros en el historial
            </p>
          </div>
        ) : (
          <div id="tour-historial-lista" className="divide-y divide-gray-100">
            {historial.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3.5 hover:bg-gray-50/80 transition-colors"
              >
                <div className="grid grid-cols-[200px_1fr] gap-4">
                  <div className="text-[11px] font-medium tracking-wide text-gray-400">
                    {formatFecha(entry.fecha)}
                  </div>
                  <div className="text-[13px] leading-[1.75] text-gray-800">
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
