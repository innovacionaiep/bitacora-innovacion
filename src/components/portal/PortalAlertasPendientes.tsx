'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ClipboardCheck,
  ImagePlus,
  BarChart3,
  Loader2,
  Wallet,
} from 'lucide-react';
import type { AlertasPortal } from '@/lib/actions/portal-inicio';
import { ActividadDetalleModal } from './ActividadDetalleModal';
import { IndicadorDetalleModal } from './IndicadorDetalleModal';
import { GastoPresupuestoDetalleModal } from './GastoPresupuestoDetalleModal';

export interface PortalAlertasPendientesProps {
  alertas: AlertasPortal | null;
  activeRole: string | null;
  loading?: boolean;
  onSuccess?: () => void | Promise<void>;
}

export function PortalAlertasPendientes({
  alertas,
  activeRole,
  loading = false,
  onSuccess,
}: PortalAlertasPendientesProps) {
  const [tab, setTab] = useState<'actividades' | 'indicadores' | 'presupuesto'>('actividades');
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
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-emerald-600" />
            Alertas pendientes
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const isCoordinador = activeRole === 'Coordinador';
  const isEncargado = activeRole === 'Encargado';

  if (!isCoordinador && !isEncargado) {
    return (
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-emerald-600" />
            Alertas pendientes
          </h3>
        </div>
        <div className="flex-1 flex items-center p-4">
          <p className="text-muted-foreground text-sm">
            Las alertas están disponibles para los roles Coordinador y Encargado.
          </p>
        </div>
      </div>
    );
  }

  const coordActividades = alertas?.coordinador?.actividadesPorValidar ?? [];
  const coordIndicadores = alertas?.coordinador?.indicadoresPorValidar ?? [];
  const coordPresupuesto = alertas?.coordinador?.presupuestoPorSolicitar ?? [];
  const encActividades = alertas?.encargado?.actividadesPorEvidenciar ?? [];
  const encIndicadores = alertas?.encargado?.indicadoresPorEvidenciar ?? [];
  const encPresupuesto = alertas?.encargado?.presupuestoPorSolicitar ?? [];

  const actividades = isCoordinador ? coordActividades : encActividades;
  const indicadores = isCoordinador ? coordIndicadores : encIndicadores;
  const presupuestoItems = isCoordinador ? coordPresupuesto : encPresupuesto;
  const labelActividades = isCoordinador ? 'Actividades por validar' : 'Actividades por evidenciar';
  const labelIndicadores = isCoordinador ? 'Indicadores por validar' : 'Indicadores por evidenciar';

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2 mb-3">
          <AlertCircle className="h-6 w-6 text-emerald-600" />
          Alertas pendientes
        </h3>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'actividades' | 'indicadores' | 'presupuesto')}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="actividades" className="gap-1.5 text-xs">
              {isCoordinador ? <ClipboardCheck className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {labelActividades}
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              {labelIndicadores}
            </TabsTrigger>
            <TabsTrigger value="presupuesto" className="gap-1.5 text-xs">
              <Wallet className="h-3.5 w-3.5" />
              Presupuesto por solicitar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {tab === 'actividades' ? (
          <div className="space-y-2">
            {actividades.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActividadModal({ actividadId: a.id, proyectoId: a.proyectoId })}
                className="w-full flex items-center gap-2 p-3 rounded-lg border-2 border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100/80 hover:border-emerald-300 hover:shadow-md transition-all duration-200 group cursor-pointer text-left overflow-x-auto"
              >
                <div className="shrink-0 p-1.5 rounded-lg bg-emerald-200/60 group-hover:bg-emerald-300/60">
                  {isCoordinador ? (
                    <ClipboardCheck className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-emerald-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-sm font-bold shrink-0 text-emerald-700">
                    Actividad
                  </span>
                    <div className="text-sm text-foreground min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
                      <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">{a.name}</span>
                      <span className="border-l border-gray-300 self-stretch min-h-[1em] shrink-0" aria-hidden />
                      <span className="text-sm font-bold text-emerald-600 shrink-0">{a.porcentaje}%</span>
                      <span className="text-sm text-red-600 shrink-0 whitespace-nowrap">
                        {isCoordinador ? 'Validación pendiente' : 'Evidencias pendientes'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap ml-auto">{a.proyectoNombre}</span>
                  </div>
                </button>
            ))}
            {actividades.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Ninguna</p>
            )}
          </div>
        ) : tab === 'indicadores' ? (
          <div className="space-y-2">
            {indicadores.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setIndicadorModal({ indicadorId: i.id, proyectoId: i.proyectoId })}
                className="w-full flex items-center gap-2 p-3 rounded-lg border-2 border-blue-200/80 bg-blue-50/80 hover:bg-blue-100/80 hover:border-blue-300 hover:shadow-md transition-all duration-200 group cursor-pointer text-left overflow-x-auto"
              >
                <div className="shrink-0 p-1.5 rounded-lg bg-blue-200/60 group-hover:bg-blue-300/60">
                  <BarChart3 className="h-5 w-5 text-blue-700" />
                </div>
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="text-sm font-bold shrink-0 text-blue-700">
                    Indicador
                  </span>
                  <div className="text-sm text-foreground min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
                    <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">{i.nombre}</span>
                    <span className="border-l border-gray-300 self-stretch min-h-[1em] shrink-0" aria-hidden />
                    <span className="text-sm font-bold shrink-0 text-blue-600">{i.porcentaje}%</span>
                    <span className="text-sm text-red-600 shrink-0 whitespace-nowrap">
                      {isCoordinador ? 'Validación pendiente' : 'Evidencias pendientes'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap ml-auto">{i.proyectoNombre}</span>
                </div>
              </button>
            ))}
            {indicadores.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Ninguno</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {presupuestoItems.map((p) => {
              const cardClasses = 'w-full flex items-center gap-2 p-3 rounded-lg border-2 border-amber-200/80 bg-amber-50/80 hover:bg-amber-100/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 group cursor-pointer text-left overflow-x-auto';
              const iconWrapperClasses = 'shrink-0 p-1.5 rounded-lg bg-amber-200/60 group-hover:bg-amber-300/60';
              const iconClasses = 'h-5 w-5 text-amber-700';
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresupuestoModal({ itemId: p.id })}
                  className={cardClasses}
                >
                  <div className={iconWrapperClasses}>
                    <Wallet className={iconClasses} />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-sm font-bold shrink-0 text-amber-700">
                      Presupuesto
                    </span>
                    <div className="text-sm text-foreground min-w-0 flex-1 flex items-center justify-start overflow-hidden gap-2">
                      <span className="truncate min-w-0 max-w-[calc(100%-3rem)] shrink">{p.item}</span>
                      <span className="border-l border-gray-300 self-stretch min-h-[1em] shrink-0" aria-hidden />
                      <span className="text-sm text-red-600 shrink-0 whitespace-nowrap">Solicitud pendiente</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap ml-auto">{p.proyectoNombre}</span>
                  </div>
                </button>
              );
            })}
            {presupuestoItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Ninguno</p>
            )}
          </div>
        )}
      </div>

      <ActividadDetalleModal
        actividadId={actividadModal?.actividadId ?? null}
        proyectoId={actividadModal?.proyectoId ?? null}
        open={!!actividadModal}
        onOpenChange={(open) => !open && setActividadModal(null)}
        canValidate={isCoordinador}
        canAddEvidencia={isCoordinador || isEncargado}
        onSuccess={onSuccess}
      />
      <IndicadorDetalleModal
        indicadorId={indicadorModal?.indicadorId ?? null}
        proyectoId={indicadorModal?.proyectoId ?? null}
        open={!!indicadorModal}
        onOpenChange={(open) => !open && setIndicadorModal(null)}
        canValidate={isCoordinador}
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
