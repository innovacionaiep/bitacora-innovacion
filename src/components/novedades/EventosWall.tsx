'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2, Users, X as XIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getPosts, PostWithRelations, toggleEventoAsistencia } from '@/lib/actions/posts';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface EventosWallProps {
  refreshTrigger?: number;
  onOpenEvento?: (postId: string) => void;
  onAttendanceChanged?: () => void;
}

export function EventosWall({ refreshTrigger, onOpenEvento, onAttendanceChanged }: EventosWallProps = {}) {
  const [eventos, setEventos] = useState<PostWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEventos = async () => {
      setLoading(true);
      const result = await getPosts({
        eventosOnly: true,
        limit: 10,
        sortBy: 'recent',
      });

      if (result.success && result.data) {
        // Filtrar solo eventos futuros o de hoy, ordenados por fecha
        const eventosFiltrados = result.data.posts
          .filter((post) => {
            if (!post.eventoFecha) {
              return false;
            }
            const fechaEvento = new Date(post.eventoFecha);
            // Mostrar eventos de hoy y futuros
            return !isPast(fechaEvento) || isToday(fechaEvento);
          })
          .sort((a, b) => {
            if (!a.eventoFecha || !b.eventoFecha) return 0;
            return new Date(a.eventoFecha).getTime() - new Date(b.eventoFecha).getTime();
          });
        setEventos(eventosFiltrados);
      }
      setLoading(false);
    };

    loadEventos();
  }, [refreshTrigger]);

  const formatEventDate = (date: Date | null): string => {
    if (!date) return '';
    
    const fechaEvento = new Date(date);
    
    if (isToday(fechaEvento)) {
      return 'Hoy';
    }
    if (isTomorrow(fechaEvento)) {
      return 'Mañana';
    }
    
    const diasDiferencia = differenceInDays(fechaEvento, new Date());
    if (diasDiferencia <= 7) {
      return format(fechaEvento, 'EEEE', { locale: es });
    }
    
    return format(fechaEvento, 'd MMM', { locale: es });
  };

  const getDateBadgeColor = (date: Date | null): string => {
    if (!date) return 'bg-gray-100 text-gray-600';
    
    const fechaEvento = new Date(date);
    
    if (isToday(fechaEvento)) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    if (isTomorrow(fechaEvento)) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    
    const diasDiferencia = differenceInDays(fechaEvento, new Date());
    if (diasDiferencia <= 7) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
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
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-orange-600" />
        <h2 className="text-sm font-semibold text-gray-900">Próximos eventos</h2>
      </div>
      
      <div className="space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
        {eventos.map((evento) => {
          if (!evento.eventoFecha || !evento.eventoNombre) return null;
          
          const fechaEvento = new Date(evento.eventoFecha);
          const fechaFormateada = format(fechaEvento, 'd MMM yyyy', { locale: es });
          
          return (
            <Card
              key={evento.id}
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer border-l-4',
                isToday(fechaEvento)
                  ? 'border-l-orange-500'
                  : isTomorrow(fechaEvento)
                  ? 'border-l-amber-500'
                  : 'border-l-blue-400'
              )}
              onClick={() => onOpenEvento?.(evento.id)}
            >
              <CardContent className="p-3">
                {/* Fecha destacada */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium border shrink-0',
                      getDateBadgeColor(evento.eventoFecha)
                    )}
                  >
                    {formatEventDate(evento.eventoFecha)}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {fechaFormateada}
                  </span>
                </div>

                {/* Contenido del evento con imagen a la derecha */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Nombre del evento */}
                    <h3 className="font-semibold text-sm text-gray-900 mb-1.5 line-clamp-2">
                      {evento.eventoNombre}
                    </h3>

                    {/* Descripción */}
                    {evento.eventoDescripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {truncateText(evento.eventoDescripcion, 80)}
                      </p>
                    )}
                  </div>
                  {/* Imagen del evento - pequeña a la derecha del texto, debajo de la fecha */}
                  {evento.imagenes && evento.imagenes.length > 0 && (
                    <div className="shrink-0">
                      {evento.imagenes.slice(0, 1).map((imagen) => (
                        <div
                          key={imagen.id}
                          className="relative w-20 h-14 rounded overflow-hidden bg-muted border border-gray-200"
                        >
                          <Image
                            src={imagen.url}
                            alt={evento.eventoNombre || 'Imagen del evento'}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proyectos asociados */}
                {evento.proyectos.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-gray-100">
                    {evento.proyectos.slice(0, 2).map(({ proyecto }) => (
                      <span
                        key={proyecto.id}
                        className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {proyecto.proyecto}
                      </span>
                    ))}
                    {evento.proyectos.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{evento.proyectos.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Asistencia */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{evento.asistentesCount ?? 0}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={evento.isAsistiendo ? 'default' : 'outline'}
                      size="sm"
                      disabled={evento.isAsistiendo}
                      className={cn(
                        'h-8 px-2.5',
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
                            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <XIcon className="h-4 w-4 text-red-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent variant="light" sideOffset={6}>
                          Cancelar asistencia
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
