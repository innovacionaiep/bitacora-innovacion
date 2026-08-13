'use client';

import { History } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { historialASegmentos } from '@/lib/historial-mensaje';

type HistorialEntry = Awaited<
  ReturnType<typeof import('@/lib/actions/historial').getHistorialRecienteParaUsuario>
>['data'][number];

export interface PortalHistorialRecienteProps {
  historial: HistorialEntry[] | null | undefined;
  loading?: boolean;
}

const PANEL_SHELL =
  'h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden';
const PANEL_HEADER =
  'flex-shrink-0 h-7 px-5 border-b border-gray-100 bg-gray-50/90 flex items-center';
const PANEL_TITLE =
  'text-[11px] font-medium tracking-wide text-gray-800 flex items-center gap-1.5 leading-none';

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
      <History className="h-3 w-3 text-gray-500" strokeWidth={1.75} />
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
              const proyectoNombre =
                (
                  entry as HistorialEntry & {
                    proyecto?: { proyecto?: string };
                  }
                ).proyecto?.proyecto ?? '';
              const segmentos = historialASegmentos({
                persona,
                accion: entry.accion,
                tabProyecto: entry.tabProyecto,
                elementoEspecifico: entry.elementoEspecifico,
                cambioGenerado: entry.cambioGenerado,
              });
              const clasePorRol: Record<string, string> = {
                persona: 'font-medium text-gray-900',
                verbo: 'font-medium text-emerald-700',
                objeto: 'font-medium text-gray-900',
                detalle: 'text-gray-500',
              };

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
                      {segmentos.map((seg, i) => {
                        const clase = clasePorRol[seg.role];
                        return clase ? (
                          <span key={i} className={clase}>
                            {seg.text}
                          </span>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        );
                      })}
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
