'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Loader2 } from 'lucide-react';

type HistorialEntry = Awaited<
  ReturnType<typeof import('@/lib/actions/historial').getHistorialRecienteParaUsuario>
>['data'][number];

export interface PortalHistorialRecienteProps {
  historial: HistorialEntry[] | null | undefined;
  loading?: boolean;
}

const CONJUGACIONES: Record<string, string> = {
  Crear: 'creado',
  Comentar: 'comentado',
  Actualizar: 'actualizado',
  'Marcar realizada': 'marcado realizada',
  'Agregar participante': 'Registrado',
  'Eliminar participante': 'Eliminado',
};

function formatFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PortalHistorialReciente({
  historial,
  loading = false,
}: PortalHistorialRecienteProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Últimas actualizaciones
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

  const list = historial ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Últimas actualizaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay actualizaciones recientes.
          </p>
        ) : (
          <ul className="space-y-4">
            {list.map((entry) => {
              const persona =
                entry.user?.name || entry.user?.email || 'Usuario';
              const avatar = entry.user?.image;
              const accionConjugada =
                CONJUGACIONES[entry.accion] || entry.accion.toLowerCase();
              const proyectoNombre = (entry as HistorialEntry & { proyecto?: { proyecto?: string } }).proyecto?.proyecto ?? '';

              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={persona}
                      className="h-8 w-8 rounded-full flex-shrink-0 ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ring-2 ring-gray-200">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(persona.charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground text-xs mb-0.5">
                      {proyectoNombre && (
                        <span className="font-medium text-foreground">
                          {proyectoNombre}
                        </span>
                      )}
                      {' · '}
                      {formatFecha(entry.fecha)}
                    </p>
                    <p>
                      <strong>{persona}</strong> ha{' '}
                      <span className="text-primary font-medium">
                        {accionConjugada}
                      </span>{' '}
                      en {entry.tabProyecto}:{' '}
                      <strong className="line-clamp-2">
                        {entry.elementoEspecifico}
                      </strong>
                      {entry.cambioGenerado &&
                        entry.accion !== 'Marcar realizada' && (
                          <span className="text-muted-foreground">
                            {' '}
                            — {entry.cambioGenerado}
                          </span>
                        )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
