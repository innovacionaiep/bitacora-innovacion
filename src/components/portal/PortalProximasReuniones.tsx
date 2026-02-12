'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, FolderKanban, Loader2 } from 'lucide-react';

type ReunionItem = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getProximasReunionesParaUsuario>
>['data'][number];

export interface PortalProximasReunionesProps {
  reuniones: ReunionItem[] | null | undefined;
  loading?: boolean;
}

function formatFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PortalProximasReuniones({
  reuniones,
  loading = false,
}: PortalProximasReunionesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximas reuniones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        </CardContent>
      </Card>
    );
  }

  const list = reuniones ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Próximas reuniones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay reuniones programadas.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((reunion) => (
              <li
                key={reunion.id}
                className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {reunion.proyecto?.proyecto ?? 'Proyecto'}
                    </p>
                    <Link
                      href={`/seguimiento?proyectoId=${reunion.proyectoId}`}
                      className="font-medium text-primary hover:underline block"
                    >
                      {formatFecha(reunion.fecha)}
                    </Link>
                    {reunion.duracionMinutos != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reunion.duracionMinutos} min
                        {reunion.coordinador?.name
                          ? ` · ${reunion.coordinador.name}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
