'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Loader2, Users, X as XIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getUpcomingEvents, PostWithRelations, toggleEventoAsistencia } from '@/lib/actions/posts';
import { format, isPast, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type ViewMode = 'tarjetas' | 'calendario';

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

interface EventosWallProps {
  initialEventos?: PostWithRelations[];
  refreshTrigger?: number;
  onOpenEvento?: (postId: string) => void;
  onAttendanceChanged?: () => void;
}

// Función para filtrar y ordenar eventos
function filterAndSortEventos(posts: PostWithRelations[]): PostWithRelations[] {
  return posts
    .filter((post) => {
      if (!post.eventoFecha) return false;
      const fechaEvento = new Date(post.eventoFecha);
      return !isPast(fechaEvento) || isToday(fechaEvento);
    })
    .sort((a, b) => {
      if (!a.eventoFecha || !b.eventoFecha) return 0;
      return new Date(a.eventoFecha).getTime() - new Date(b.eventoFecha).getTime();
    });
}

// Agrupar eventos por fecha (YYYY-MM-DD)
function groupEventosByDate(eventos: PostWithRelations[]): Map<string, PostWithRelations[]> {
  const map = new Map<string, PostWithRelations[]>();
  for (const e of eventos) {
    if (!e.eventoFecha) continue;
    const key = format(new Date(e.eventoFecha), 'yyyy-MM-dd');
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return map;
}

export function EventosWall({ initialEventos = [], refreshTrigger, onOpenEvento, onAttendanceChanged }: EventosWallProps = {}) {
  // Usar datos iniciales si están disponibles
  const [eventos, setEventos] = useState<PostWithRelations[]>(() => filterAndSortEventos(initialEventos));
  const [loading, setLoading] = useState(initialEventos.length === 0);
  const [viewMode, setViewMode] = useState<ViewMode>('tarjetas');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const prevRefreshTriggerRef = useRef(refreshTrigger);

  const eventosByDate = useMemo(() => groupEventosByDate(eventos), [eventos]);

  // Solo recargar cuando refreshTrigger cambia (no al montar si hay datos iniciales)
  useEffect(() => {
    // Si hay datos iniciales y es el primer render, no cargar
    if (initialEventos.length > 0 && refreshTrigger === prevRefreshTriggerRef.current) {
      return;
    }
    
    // Solo recargar si refreshTrigger realmente cambió
    if (refreshTrigger === prevRefreshTriggerRef.current) {
      return;
    }
    
    prevRefreshTriggerRef.current = refreshTrigger;
    
    const loadEventos = async () => {
      setLoading(true);
      const result = await getUpcomingEvents(10);

      if (result.success && result.data) {
        setEventos(filterAndSortEventos(result.data.posts));
      }
      setLoading(false);
    };

    loadEventos();
  }, [refreshTrigger, initialEventos.length]);

  // Días del mes para la vista calendario (siempre mismo número de hooks en cada render)
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const startWeekday = start.getDay();
    const leading = Array.from({ length: startWeekday }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (startWeekday - i));
      return d;
    });
    const trailingCount = 42 - (leading.length + days.length);
    const trailing = Array.from({ length: trailingCount }, (_, i) => {
      const d = new Date(end);
      d.setDate(d.getDate() + i + 1);
      return d;
    });
    return [...leading, ...days, ...trailing];
  }, [calendarMonth]);

  const formatEventDate = (date: Date | null): string => {
    if (!date) return '';
    const fechaEvento = new Date(date);
    return format(fechaEvento, 'd MMM', { locale: es });
  };

  const getDateBadgeColor = (_date: Date | null): string => {
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const handleToggleAsistencia = async (postId: string) => {
    // Optimismo simple: se actualizará definitivamente al recargar
    const prev = eventos;
    setEventos((cur) =>
      cur.map((e) => {
        if (e.id !== postId) return e;
        const nextIsAsistiendo = !e.isAsistiendo;
        const nextCount = Math.max(0, (e.asistentesCount ?? 0) + (nextIsAsistiendo ? 1 : -1));
        return { ...e, isAsistiendo: nextIsAsistiendo, asistentesCount: nextCount };
      })
    );

    const res = await toggleEventoAsistencia(postId);
    if (!res.success) {
      setEventos(prev);
      return;
    }
    // Sincronizar con server (conteos exactos)
    onAttendanceChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No hay eventos próximos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-[18px] w-[18px] text-emerald-600 shrink-0" />
          <h2 className="text-[18px] font-semibold text-emerald-600">Próximos eventos</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/80 p-0.5">
          <Button
            type="button"
            variant={viewMode === 'tarjetas' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-2.5 text-xs gap-1.5',
              viewMode === 'tarjetas'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
            onClick={() => setViewMode('tarjetas')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Tarjetas
          </Button>
          <Button
            type="button"
            variant={viewMode === 'calendario' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-8 px-2.5 text-xs gap-1.5',
              viewMode === 'calendario'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
            onClick={() => setViewMode('calendario')}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendario
          </Button>
        </div>
      </div>

      {/* Contenedor con altura mínima para que "Próximas convocatorias" no se desplace al cambiar a calendario */}
      <div className="min-h-[27rem]">
      {viewMode === 'tarjetas' && (
      <div
        className="overflow-y-auto pr-2 space-y-2.5 shrink-0 custom-scrollbar"
        style={{ height: '27rem' }}
      >
        {eventos.map((evento) => {
          if (!evento.eventoFecha || !evento.eventoNombre) return null;
          
          const fechaEvento = new Date(evento.eventoFecha);
          
          return (
            <Card
              key={evento.id}
              className="border-2 border-gray-100 hover:border-emerald-600 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => onOpenEvento?.(evento.id)}
            >
              <CardContent className="p-0">
                {/* Banner: desde el top hasta la línea separadora; incluye imagen de fondo + badge de fecha + título del evento (mismo espacio que antes fecha+título) */}
                <div className="relative w-full h-14 overflow-hidden bg-muted rounded-t-[var(--radius)]">
                  {evento.imagenes && evento.imagenes.length > 0 ? (
                    evento.imagenes.slice(0, 1).map((imagen) => (
                      <Image
                        key={imagen.id}
                        src={imagen.url}
                        alt={evento.eventoNombre || 'Imagen del evento'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 320px) 280px, 100vw"
                      />
                    ))
                  ) : (
                    <div className="absolute inset-0 bg-gray-200" />
                  )}
                  <div className="absolute inset-0 p-2 flex flex-col justify-between">
                    <div
                      className={cn(
                        'px-1.5 py-px rounded-md text-xs font-medium border w-fit shrink-0 bg-white/95 shadow-sm leading-tight',
                        getDateBadgeColor(evento.eventoFecha)
                      )}
                    >
                      {formatEventDate(evento.eventoFecha)}
                    </div>
                    <div className="rounded bg-black/50 px-1.5 py-0 w-fit max-w-full inline-block">
                      <h3 className="font-semibold text-sm text-white drop-shadow-sm line-clamp-2 leading-tight m-0">
                        {evento.eventoNombre}
                      </h3>
                    </div>
                  </div>
                </div>
                {/* Debajo del banner: línea separadora, nombre del proyecto y acciones */}
                <div className="p-2 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-2 w-full">
                    {/* Nombre del o los proyectos — alineado a la izquierda */}
                    <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                      {evento.proyectos.length > 0 ? (
                        <>
                          {evento.proyectos.slice(0, 1).map(({ proyecto }) => (
                            <span
                              key={proyecto.id}
                              className="text-xs px-1 py-0.5 bg-gray-100 text-gray-600 rounded truncate max-w-[240px]"
                              title={proyecto.proyecto}
                            >
                              {proyecto.proyecto}
                            </span>
                          ))}
                          {evento.proyectos.length > 1 && (
                            <span className="text-xs text-muted-foreground">
                              +{evento.proyectos.length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground" />
                      )}
                    </div>
                    {/* Contador y botón Asistiré — alineados a la derecha */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{evento.asistentesCount ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant={evento.isAsistiendo ? 'default' : 'outline'}
                          size="sm"
                          disabled={evento.isAsistiendo}
                          className={cn(
                            'h-7 px-2 text-xs',
                            evento.isAsistiendo && 'bg-emerald-600 hover:bg-emerald-600 cursor-not-allowed'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!evento.isAsistiendo) {
                              handleToggleAsistencia(evento.id);
                            }
                          }}
                        >
                          Asistiré
                        </Button>
                        {evento.isAsistiendo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAsistencia(evento.id);
                                }}
                                className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <XIcon className="h-3.5 w-3.5 text-red-600" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent variant="light" sideOffset={6}>
                              Cancelar asistencia
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      {viewMode === 'calendario' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-800 capitalize">
              {format(calendarMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-1"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, index) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEventos = eventosByDate.get(key) ?? [];
                const inMonth = isSameMonth(day, calendarMonth);
                const isTodayDate = isSameDay(day, new Date());

                const cell = (
                  <div
                    key={`${key}-${index}`}
                    className={cn(
                      'min-h-[2.25rem] flex items-center justify-center text-sm rounded-md transition-colors',
                      !inMonth && 'text-gray-300',
                      inMonth && 'text-gray-700',
                      inMonth && isTodayDate && 'bg-gray-200 text-black',
                      dayEventos.length > 0 && inMonth && 'cursor-default'
                    )}
                  >
                    {dayEventos.length > 0 && inMonth ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 text-xs font-bold ring-2 ring-emerald-600 hover:ring-emerald-700 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
                            onClick={() => onOpenEvento?.(dayEventos[0].id)}
                          >
                            {day.getDate()}
                            <span
                              className="absolute -top-1 -right-1 flex h-4 w-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white leading-none"
                              aria-label={`${dayEventos.length} evento${dayEventos.length !== 1 ? 's' : ''}`}
                            >
                              {dayEventos.length}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          variant="light"
                          side="top"
                          sideOffset={6}
                          className="max-w-[320px] w-max p-0 border-0 shadow-xl bg-transparent"
                        >
                          <div className="space-y-2.5 p-1 bg-white rounded-lg border border-gray-200 shadow-lg">
                            {dayEventos.map((evento) => {
                              if (!evento.eventoFecha || !evento.eventoNombre) return null;
                              return (
                                <Card
                                  key={evento.id}
                                  className={cn(
                                    'border-2 border-gray-100 transition-all duration-200 cursor-pointer overflow-hidden w-[280px] shrink-0',
                                    dayEventos.length > 1 && 'hover:border-emerald-600 hover:shadow-md'
                                  )}
                                  onClick={() => onOpenEvento?.(evento.id)}
                                >
                                  <CardContent className="p-0">
                                    <div className="relative w-full h-14 overflow-hidden bg-muted rounded-t-[var(--radius)]">
                                      {evento.imagenes && evento.imagenes.length > 0 ? (
                                        evento.imagenes.slice(0, 1).map((imagen) => (
                                          <Image
                                            key={imagen.id}
                                            src={imagen.url}
                                            alt={evento.eventoNombre || 'Imagen del evento'}
                                            fill
                                            className="object-cover"
                                            sizes="280px"
                                          />
                                        ))
                                      ) : (
                                        <div className="absolute inset-0 bg-gray-200" />
                                      )}
                                      <div className="absolute inset-0 p-2 flex flex-col justify-between">
                                        <div
                                          className={cn(
                                            'px-1.5 py-px rounded-md text-xs font-medium border w-fit shrink-0 bg-white/95 shadow-sm leading-tight',
                                            getDateBadgeColor(evento.eventoFecha)
                                          )}
                                        >
                                          {formatEventDate(evento.eventoFecha)}
                                        </div>
                                        <div className="rounded bg-black/50 px-1.5 py-0 w-fit max-w-full inline-block">
                                          <h3 className="font-semibold text-sm text-white drop-shadow-sm line-clamp-2 leading-tight m-0">
                                            {evento.eventoNombre}
                                          </h3>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-2 border-t border-gray-100">
                                      <div className="flex items-center justify-between gap-2 w-full">
                                        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                                          {evento.proyectos.length > 0 ? (
                                            <>
                                              {evento.proyectos.slice(0, 1).map(({ proyecto }) => (
                                                <span
                                                  key={proyecto.id}
                                                  className="text-xs px-1 py-0.5 bg-gray-100 text-gray-600 rounded truncate max-w-[140px]"
                                                  title={proyecto.proyecto}
                                                >
                                                  {proyecto.proyecto}
                                                </span>
                                              ))}
                                              {evento.proyectos.length > 1 && (
                                                <span className="text-xs text-muted-foreground">
                                                  +{evento.proyectos.length - 1}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-xs text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            <span>{evento.asistentesCount ?? 0}</span>
                                          </div>
                                          <Button
                                            type="button"
                                            variant={evento.isAsistiendo ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={evento.isAsistiendo}
                                            className={cn(
                                              'h-7 px-2 text-xs',
                                              evento.isAsistiendo && 'bg-emerald-600 hover:bg-emerald-600 cursor-not-allowed'
                                            )}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!evento.isAsistiendo) {
                                                handleToggleAsistencia(evento.id);
                                              }
                                            }}
                                          >
                                            Asistiré
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span>{day.getDate()}</span>
                    )}
                  </div>
                );
                return cell;
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
