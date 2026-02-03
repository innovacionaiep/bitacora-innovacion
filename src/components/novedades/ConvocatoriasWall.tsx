'use client';

import { ClipboardList, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export interface ConvocatoriaPlaceholder {
  id: string;
  titulo: string;
  fechaInicio: Date;
  fechaFin: Date;
  descripcion?: string;
  imagenUrl?: string | null;
}

interface ConvocatoriasWallProps {
  convocatorias?: ConvocatoriaPlaceholder[];
  isAdmin?: boolean;
  onPostular?: (convocatoriaId: string) => void;
  onCreate?: () => void;
}

export function ConvocatoriasWall({
  convocatorias = [],
  isAdmin = false,
  onPostular,
  onCreate,
}: ConvocatoriasWallProps) {
  const formatDateRange = (inicio: Date, fin: Date): string => {
    const i = new Date(inicio);
    const f = new Date(fin);
    return `${format(i, 'd MMM', { locale: es })} - ${format(f, 'd MMM', { locale: es })}`;
  };

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-[18px] w-[18px] text-emerald-600 shrink-0" />
          <h2 className="text-[18px] font-semibold text-emerald-600">
            Próximas convocatorias
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreate?.();
              }}
              className="flex items-center justify-center h-7 w-7 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              title="Nueva convocatoria"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className="overflow-y-auto pr-2 space-y-2.5 shrink-0 custom-scrollbar"
        style={{ height: '14rem' }}
      >
        {convocatorias.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay convocatorias próximas
            </p>
          </div>
        ) : (
          convocatorias.map((conv) => (
            <Card key={conv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div
                      className={cn(
                        'px-1.5 py-0.5 rounded-md text-xs font-medium border w-fit shrink-0 bg-gray-50 text-gray-600 border-gray-200'
                      )}
                    >
                      {formatDateRange(conv.fechaInicio, conv.fechaFin)}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {conv.titulo}
                    </h3>
                  </div>
                  <div className="relative w-16 h-12 rounded overflow-hidden bg-muted border border-gray-200 shrink-0">
                    {conv.imagenUrl ? (
                      <Image
                        src={conv.imagenUrl}
                        alt={conv.titulo}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 mt-1 border-t border-gray-100 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                    onClick={() => onPostular?.(conv.id)}
                  >
                    Postular
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
