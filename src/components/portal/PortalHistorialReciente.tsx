'use client';

import { History } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/lib/avatars';

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

const PANEL_SHELL =
  'h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden';
const PANEL_HEADER =
  'flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50/90';
const PANEL_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2';

function formatFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PanelTitle() {
  return (
    <h3 className={PANEL_TITLE}>
      <History className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
      Últimas actualizaciones
    </h3>
  );
}

export function PortalHistorialReciente({
  historial,
  loading = false,
}: PortalHistorialRecienteProps) {
  if (loading) {
    return (
      <div className={PANEL_SHELL}>
        <div className={PANEL_HEADER}>
          <PanelTitle />
        </div>
        <div className="flex-1 min-h-[80px]" />
      </div>
    );
  }

  const list = historial ?? [];

  return (
    <div className={PANEL_SHELL}>
      <div className={PANEL_HEADER}>
        <PanelTitle />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {list.length === 0 ? (
          <p className="text-[13px] text-gray-400 px-5 py-4">
            No hay actualizaciones recientes.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((entry) => {
              const persona =
                entry.user?.name || entry.user?.email || 'Usuario';
              const accionConjugada =
                CONJUGACIONES[entry.accion] || entry.accion.toLowerCase();
              const proyectoNombre =
                (
                  entry as HistorialEntry & {
                    proyecto?: { proyecto?: string };
                  }
                ).proyecto?.proyecto ?? '';

              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 px-5 py-3 text-[13px] hover:bg-gray-50/80 transition-colors"
                >
                  <img
                    src={DEFAULT_AVATAR}
                    alt={persona}
                    className="h-7 w-7 rounded-full flex-shrink-0 border border-gray-200 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500 tracking-wide mb-0.5">
                      {proyectoNombre && (
                        <span className="font-medium text-gray-700">
                          {proyectoNombre}
                        </span>
                      )}
                      {proyectoNombre ? ' · ' : ''}
                      {formatFecha(entry.fecha)}
                    </p>
                    <p className="text-[13px] text-gray-800 leading-snug break-words [overflow-wrap:anywhere]">
                      <span className="font-medium text-gray-900">{persona}</span>{' '}
                      ha{' '}
                      <span className="font-medium text-emerald-700">
                        {accionConjugada}
                      </span>{' '}
                      en {entry.tabProyecto}:{' '}
                      <span className="font-medium text-gray-900 line-clamp-2">
                        {entry.elementoEspecifico}
                      </span>
                      {entry.cambioGenerado &&
                        entry.accion !== 'Marcar realizada' && (
                          <span className="text-gray-500">
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
