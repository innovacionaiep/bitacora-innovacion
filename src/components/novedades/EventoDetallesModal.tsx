'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Calendar as CalendarIcon, Loader2, Users, X as XIcon, User as UserIcon } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getEventoDetalles, toggleEventoAsistencia, type EventoDetallesResult } from '@/lib/actions/posts';

interface EventoDetallesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  onAttendanceChanged?: () => void;
}

function formatEventDate(date: Date) {
  const d = new Date(date);
  if (isToday(d)) return `Hoy · ${format(d, 'd MMM yyyy', { locale: es })}`;
  if (isTomorrow(d)) return `Mañana · ${format(d, 'd MMM yyyy', { locale: es })}`;
  return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
}

function getInitials(nameOrEmail: string) {
  return (nameOrEmail || 'U').slice(0, 2).toUpperCase();
}

export function EventoDetallesModal({
  open,
  onOpenChange,
  postId,
  onAttendanceChanged,
}: EventoDetallesModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventoDetallesResult['data'] | null>(null);

  const imageUrl = data?.imagenUrl ?? null;

  const uniqueEncargados = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; email: string; image: string | null; cargo: string | null }>();
    for (const p of data?.proyectos ?? []) {
      for (const e of p.encargados ?? []) map.set(e.id, e);
    }
    return Array.from(map.values());
  }, [data]);

  useEffect(() => {
    const run = async () => {
      if (!open || !postId) return;
      setLoading(true);
      setError(null);
      const res = await getEventoDetalles(postId);
      if (!res.success || !res.data) {
        setError(res.error || 'No se pudo cargar el evento');
        setData(null);
      } else {
        setData(res.data);
      }
      setLoading(false);
    };
    run();
  }, [open, postId]);

  const handleToggleAsistencia = async () => {
    if (!postId) return;
    setError(null);
    const res = await toggleEventoAsistencia(postId);
    if (!res.success) {
      setError(res.error || 'No se pudo actualizar la asistencia');
      return;
    }
    onAttendanceChanged?.();
    // Re-cargar detalles para reflejar conteo y lista
    const refetch = await getEventoDetalles(postId);
    if (refetch.success && refetch.data) setData(refetch.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-orange-600" />
              <span>Detalles del evento</span>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="px-6 pb-6">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : data ? (
            <div className="px-6 pb-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    {data.eventoNombre}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatEventDate(data.eventoFecha)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {data.asistentesCount} asistente{data.asistentesCount === 1 ? '' : 's'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {imageUrl ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border bg-muted">
                      <Image src={imageUrl} alt={data.eventoNombre} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                      <UserIcon className="h-8 w-8" />
                    </div>
                  )}

                  <div className="p-4 rounded-xl border bg-white">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {data.eventoDescripcion}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-white">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Proyectos asociados</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.proyectos.map((p) => (
                        <Badge key={p.id} variant="outline" className="text-xs">
                          {p.proyecto}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.sedes.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                      {data.escuelas.map((e) => (
                        <Badge key={e.id} variant="secondary" className="text-xs">
                          {e.nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-white">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Publicado por</h3>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={data.author.image || undefined} />
                        <AvatarFallback>{getInitials(data.author.name || data.author.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {data.author.name || data.author.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">{data.author.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-white">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Encargados del/los proyecto(s)</h3>
                    {uniqueEncargados.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay encargados asignados.</p>
                    ) : (
                      <div className="space-y-2">
                        {uniqueEncargados.map((e) => (
                          <div key={e.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={e.image || undefined} />
                              <AvatarFallback>{getInitials(e.name || e.email)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {e.name || e.email.split('@')[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {e.cargo || e.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Asistentes confirmados</h3>
                        <p className="text-xs text-muted-foreground">
                          {data.asistentesCount} confirmado{data.asistentesCount === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleToggleAsistencia}
                          disabled={data.isAsistiendo}
                          className={cn(
                            'gap-2',
                            data.isAsistiendo ? 'bg-emerald-600 hover:bg-emerald-600 cursor-not-allowed' : ''
                          )}
                          variant={data.isAsistiendo ? 'default' : 'outline'}
                        >
                          Asistiré
                        </Button>
                        {data.isAsistiendo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleToggleAsistencia}
                                className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-red-50 transition-colors"
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

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.asistentes.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 p-2 rounded-lg border bg-gray-50"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.image || undefined} />
                            <AvatarFallback>{getInitials(a.name || a.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {a.name || a.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

