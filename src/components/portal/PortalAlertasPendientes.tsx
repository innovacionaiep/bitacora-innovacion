'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ClipboardCheck,
  ImagePlus,
  BarChart3,
  Loader2,
} from 'lucide-react';
import type { AlertasPortal } from '@/lib/actions/portal-inicio';
import { ActividadDetalleModal } from './ActividadDetalleModal';

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
  const [tab, setTab] = useState<'actividades' | 'indicadores'>('actividades');
  const [actividadModal, setActividadModal] = useState<{
    actividadId: string;
    proyectoId: string;
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
  const encActividades = alertas?.encargado?.actividadesPorEvidenciar ?? [];
  const encIndicadores = alertas?.encargado?.indicadoresPorEvidenciar ?? [];

  const actividades = isCoordinador ? coordActividades : encActividades;
  const indicadores = isCoordinador ? coordIndicadores : encIndicadores;
  const labelActividades = isCoordinador ? 'Actividades por validar' : 'Actividades por evidenciar';
  const labelIndicadores = isCoordinador ? 'Indicadores por validar' : 'Indicadores por evidenciar';

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2 mb-3">
          <AlertCircle className="h-6 w-6 text-emerald-600" />
          Alertas pendientes
        </h3>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'actividades' | 'indicadores')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="actividades" className="gap-1.5 text-xs">
              {isCoordinador ? <ClipboardCheck className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {labelActividades}
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              {labelIndicadores}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {tab === 'actividades' ? (
          <div className="space-y-2">
            {actividades.map((a) => {
              const isPorEvidenciar = isEncargado;
              const cardClasses = isPorEvidenciar
                ? 'w-full flex items-center gap-2 p-3 rounded-lg border-2 border-emerald-200/80 bg-emerald-50/80 hover:bg-emerald-100/80 hover:border-emerald-300 hover:shadow-md transition-all duration-200 group cursor-pointer text-left overflow-x-auto'
                : 'w-full flex items-center gap-2 p-3 rounded-lg border-2 border-amber-200/80 bg-amber-50/80 hover:bg-amber-100/80 hover:border-amber-300 hover:shadow-md transition-all duration-200 group cursor-pointer text-left overflow-x-auto';
              const iconWrapperClasses = isPorEvidenciar
                ? 'shrink-0 p-1.5 rounded-lg bg-emerald-200/60 group-hover:bg-emerald-300/60'
                : 'shrink-0 p-1.5 rounded-lg bg-amber-200/60 group-hover:bg-amber-300/60';
              const iconClasses = isPorEvidenciar
                ? 'h-5 w-5 text-emerald-700'
                : 'h-5 w-5 text-amber-700';
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActividadModal({ actividadId: a.id, proyectoId: a.proyectoId })}
                  className={cardClasses}
                >
                  <div className={iconWrapperClasses}>
                    {isCoordinador ? (
                      <ClipboardCheck className={iconClasses} />
                    ) : (
                      <ImagePlus className={iconClasses} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className={`font-bold shrink-0 ${isPorEvidenciar ? 'text-emerald-700' : 'text-amber-700'}`}>
                      Actividad
                    </span>
                    <span className="text-sm text-foreground truncate flex-1 min-w-0">{a.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{a.proyectoNombre}</span>
                  </div>
                </button>
              );
            })}
            {actividades.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Ninguna</p>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {indicadores.map((i) => (
              <li key={i.id}>
                <Link href="/proyectos" className="text-sm text-primary hover:underline">
                  {i.nombre}
                </Link>
                <span className="text-xs text-muted-foreground ml-2">— {i.proyectoNombre}</span>
              </li>
            ))}
            {indicadores.length === 0 && (
              <li className="text-sm text-muted-foreground">Ninguno</li>
            )}
          </ul>
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
    </div>
  );
}
