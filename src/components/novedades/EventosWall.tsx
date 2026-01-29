'use client';

import { useEffect, useState, useRef } from 'react';
import { Calendar, Loader2, Users, X as XIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getUpcomingEvents, PostWithRelations, toggleEventoAsistencia } from '@/lib/actions/posts';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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

export function EventosWall({ initialEventos = [], refreshTrigger, onOpenEvento, onAttendanceChanged }: EventosWallProps = {}) {
  // Usar datos iniciales si están disponibles
  const [eventos, setEventos] = useState<PostWithRelations[]>(() => filterAndSortEventos(initialEventos));
  const [loading, setLoading] = useState(initialEventos.length === 0);
  const prevRefreshTriggerRef = useRef(refreshTrigger);

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
        <Calendar className="h-4 w-4 text-gray-700" />
        <h2 className="text-base font-semibold text-gray-900">Próximos eventos</h2>
      </div>
      
      <div className="space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
        {eventos.map((evento) => {
          if (!evento.eventoFecha || !evento.eventoNombre) return null;
          
          const fechaEvento = new Date(evento.eventoFecha);
          
          return (
            <Card
              key={evento.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onOpenEvento?.(evento.id)}
            >
              <CardContent className="p-2">
                {/* Dos contenedores independientes: columna izq (fecha + título + resto) y columna dcha (solo imagen) */}
                <div className="flex items-start gap-2">
                  {/* Columna izquierda: flujo normal — fecha, título y pie; la posición del título no depende de la imagen */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div
                      className={cn(
                        'px-1.5 py-0.5 rounded-md text-xs font-medium border w-fit shrink-0',
                        getDateBadgeColor(evento.eventoFecha)
                      )}
                    >
                      {formatEventDate(evento.eventoFecha)}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {evento.eventoNombre}
                    </h3>
                  </div>
                  {/* Columna derecha: solo imagen, alineada arriba; no afecta la posición del título */}
                  <div className="relative w-16 h-12 rounded overflow-hidden bg-muted border border-gray-200 shrink-0">
                    {evento.imagenes && evento.imagenes.length > 0 ? (
                      evento.imagenes.slice(0, 1).map((imagen) => (
                        <Image
                          key={imagen.id}
                          src={imagen.url}
                          alt={evento.eventoNombre || 'Imagen del evento'}
                          fill
                          className="object-cover"
                        />
                      ))
                    ) : null}
                  </div>
                </div>
                {/* Fila a ancho completo: proyectos a la izquierda, contador y Asistiré a la derecha */}
                <div className="flex items-center justify-between gap-2 pt-1 mt-1 border-t border-gray-100 w-full">
                  {/* Nombre del o los proyectos — alineado a la izquierda */}
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
