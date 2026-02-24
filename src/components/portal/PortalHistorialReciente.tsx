'use client';

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
  Validar: 'validado',
  Eliminar: 'eliminado',
  'Subir evidencia': 'subido nuevas evidencias',
  'Eliminar evidencia': 'eliminado evidencias',
  'Cambio de estado en kanban': 'cambiado',
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
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
            <History className="h-6 w-6 text-emerald-600" />
            Últimas actualizaciones
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const list = historial ?? [];

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
          <History className="h-6 w-6 text-emerald-600" />
          Últimas actualizaciones
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
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
      </div>
    </div>
  );
}
