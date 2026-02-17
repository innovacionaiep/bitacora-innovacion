'use client';

import Link from 'next/link';
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
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-600" />
            Próximas reuniones
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const list = reuniones ?? [];

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-emerald-600" />
          Próximas reuniones
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay reuniones programadas.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((reunion) => (
              <li key={reunion.id}>
                <Link
                  href={`/proyectos?id=${reunion.proyectoId}&tab=Seguimiento`}
                  className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {reunion.proyecto?.proyecto ?? 'Proyecto'}
                      </p>
                      <p className="font-medium text-primary">
                        {formatFecha(reunion.fecha)}
                      </p>
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
