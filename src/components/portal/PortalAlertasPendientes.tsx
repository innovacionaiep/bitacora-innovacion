'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ImagePlus,
  BarChart3,
  Loader2,
  Wallet,
} from 'lucide-react';
import type { AlertasPortal } from '@/lib/actions/portal-inicio';
import { ActividadDetalleModal } from './ActividadDetalleModal';
import { IndicadorDetalleModal } from './IndicadorDetalleModal';
import { GastoPresupuestoDetalleModal } from './GastoPresupuestoDetalleModal';
import { cn } from '@/lib/utils';

export interface PortalAlertasPendientesProps {
  alertas: AlertasPortal | null;
  activeRole: string | null;
  loading?: boolean;
  onSuccess?: () => void | Promise<void>;
}

const PANEL_SHELL =
  'h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden';
const PANEL_HEADER =
  'flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50/90';
const PANEL_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2';

const ALERT_ROW =
  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/80 transition-colors group cursor-pointer text-left overflow-x-auto shadow-none';

function PanelTitle() {
  return (
    <h3 className={PANEL_TITLE}>
      <AlertCircle className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
      Alertas pendientes
    </h3>
  );
}

export function PortalAlertasPendientes({
  alertas,
  activeRole,
  loading = false,
  onSuccess,
}: PortalAlertasPendientesProps) {
  const isCoordinador = activeRole === 'Coordinador';
  const isEncargado = activeRole === 'Encargado';
  const [tab, setTab] = useState<'actividades' | 'indicadores' | 'presupuesto'>(
    isCoordinador ? 'presupuesto' : 'actividades'
  );
  const [actividadModal, setActividadModal] = useState<{
    actividadId: string;
    proyectoId: string;
  } | null>(null);
  const [indicadorModal, setIndicadorModal] = useState<{
    indicadorId: string;
    proyectoId: string;
  } | null>(null);
  const [presupuestoModal, setPresupuestoModal] = useState<{
    itemId: string;
  } | null>(null);

  if (loading) {
    return (
      <div className={PANEL_SHELL}>
        <div className={PANEL_HEADER}>
          <PanelTitle />
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!isCoordinador && !isEncargado) {
    return (
      <div className={PANEL_SHELL}>
        <div className={PANEL_HEADER}>
          <PanelTitle />
        </div>
        <div className="flex-1 flex items-center px-5 py-4">
          <p className="text-[13px] text-gray-400">
            Las alertas están disponibles para los roles Coordinador y Encargado.
          </p>
        </div>
      </div>
    );
  }

  const presupuestoItems = isCoordinador
    ? (alertas?.coordinador?.presupuestoPorSolicitar ?? [])
    : (alertas?.encargado?.presupuestoPorSolicitar ?? []);
  const actividades = alertas?.encargado?.actividadesPorEvidenciar ?? [];
  const indicadores = alertas?.encargado?.indicadoresPorEvidenciar ?? [];

  const presupuestoList = (
    <div className="space-y-1.5">
      {presupuestoItems.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPresupuestoModal({ itemId: p.id })}
          className={ALERT_ROW}
        >
          <Wallet className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.75} />
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="text-[11px] font-medium tracking-wide shrink-0 text-amber-700">
              Presupuesto
            </span>
            <div className="text-[13px] text-gray-800 min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
              <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">
                {p.item}
              </span>
              <span
                className="border-l border-gray-200 self-stretch min-h-[1em] shrink-0"
                aria-hidden
              />
              <span className="text-[13px] text-red-600 shrink-0 whitespace-nowrap">
                Solicitud pendiente
              </span>
            </div>
            <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap ml-auto">
              {p.proyectoNombre}
            </span>
          </div>
        </button>
      ))}
      {presupuestoItems.length === 0 && (
        <p className="text-[13px] text-gray-400 py-2">Ninguno</p>
      )}
    </div>
  );

  return (
    <div className={PANEL_SHELL}>
      <div className={PANEL_HEADER}>
        <PanelTitle />
        {isEncargado && (
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab(v as 'actividades' | 'indicadores' | 'presupuesto')
            }
            className="mt-3"
          >
            <TabsList className="w-full grid grid-cols-3 h-auto bg-transparent p-0 gap-0 rounded-none border-0 shadow-none">
              {(
                [
                  {
                    value: 'actividades' as const,
                    icon: ImagePlus,
                    label: 'Actividades por evidenciar',
                  },
                  {
                    value: 'indicadores' as const,
                    icon: BarChart3,
                    label: 'Indicadores por evidenciar',
                  },
                  {
                    value: 'presupuesto' as const,
                    icon: Wallet,
                    label: 'Presupuesto por solicitar',
                  },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'group relative rounded-none border-0 bg-transparent shadow-none px-2 py-2 text-[13px] tracking-wide gap-1.5',
                    'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                    'text-gray-500 hover:text-gray-800 data-[state=active]:text-gray-900 data-[state=active]:font-medium',
                    'focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span className="truncate">{label}</span>
                  <span
                    className={cn(
                      'absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-colors',
                      tab === value ? 'bg-emerald-600' : 'bg-transparent group-hover:bg-gray-300'
                    )}
                    aria-hidden
                  />
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-5 py-3">
        {isCoordinador ? (
          presupuestoList
        ) : tab === 'actividades' ? (
          <div className="space-y-1.5">
            {actividades.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setActividadModal({
                    actividadId: a.id,
                    proyectoId: a.proyectoId,
                  })
                }
                className={ALERT_ROW}
              >
                <ImagePlus
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-[11px] font-medium tracking-wide shrink-0 text-emerald-700">
                    Actividad
                  </span>
                  <div className="text-[13px] text-gray-800 min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
                    <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">
                      {a.name}
                    </span>
                    <span
                      className="border-l border-gray-200 self-stretch min-h-[1em] shrink-0"
                      aria-hidden
                    />
                    <span className="text-[13px] font-semibold tabular-nums text-emerald-700 shrink-0">
                      {a.porcentaje}%
                    </span>
                    <span className="text-[13px] text-red-600 shrink-0 whitespace-nowrap">
                      Evidencias pendientes
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap ml-auto">
                    {a.proyectoNombre}
                  </span>
                </div>
              </button>
            ))}
            {actividades.length === 0 && (
              <p className="text-[13px] text-gray-400 py-2">Ninguna</p>
            )}
          </div>
        ) : tab === 'indicadores' ? (
          <div className="space-y-1.5">
            {indicadores.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() =>
                  setIndicadorModal({
                    indicadorId: i.id,
                    proyectoId: i.proyectoId,
                  })
                }
                className={ALERT_ROW}
              >
                <BarChart3
                  className="h-4 w-4 shrink-0 text-blue-600"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-[11px] font-medium tracking-wide shrink-0 text-blue-700">
                    Indicador
                  </span>
                  <div className="text-[13px] text-gray-800 min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
                    <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">
                      {i.nombre}
                    </span>
                    <span
                      className="border-l border-gray-200 self-stretch min-h-[1em] shrink-0"
                      aria-hidden
                    />
                    <span className="text-[13px] font-semibold tabular-nums text-blue-700 shrink-0">
                      {i.porcentaje}%
                    </span>
                    <span className="text-[13px] text-red-600 shrink-0 whitespace-nowrap">
                      Evidencias pendientes
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 shrink-0 whitespace-nowrap ml-auto">
                    {i.proyectoNombre}
                  </span>
                </div>
              </button>
            ))}
            {indicadores.length === 0 && (
              <p className="text-[13px] text-gray-400 py-2">Ninguno</p>
            )}
          </div>
        ) : (
          presupuestoList
        )}
      </div>

      <ActividadDetalleModal
        actividadId={actividadModal?.actividadId ?? null}
        proyectoId={actividadModal?.proyectoId ?? null}
        open={!!actividadModal}
        onOpenChange={(open) => !open && setActividadModal(null)}
        canAddEvidencia={isEncargado}
        onSuccess={onSuccess}
      />
      <IndicadorDetalleModal
        indicadorId={indicadorModal?.indicadorId ?? null}
        proyectoId={indicadorModal?.proyectoId ?? null}
        open={!!indicadorModal}
        onOpenChange={(open) => !open && setIndicadorModal(null)}
        onSuccess={onSuccess}
      />
      <GastoPresupuestoDetalleModal
        itemId={presupuestoModal?.itemId ?? null}
        open={!!presupuestoModal}
        onOpenChange={(open) => !open && setPresupuestoModal(null)}
        onSuccess={onSuccess}
      />
    </div>
  );
}
