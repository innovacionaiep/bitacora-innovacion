'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  ClipboardCheck,
  ImagePlus,
  BarChart3,
  Loader2,
} from 'lucide-react';
import type { AlertasPortal } from '@/lib/actions/portal-inicio';

export interface PortalAlertasPendientesProps {
  alertas: AlertasPortal | null;
  activeRole: string | null;
  loading?: boolean;
}

export function PortalAlertasPendientes({
  alertas,
  activeRole,
  loading = false,
}: PortalAlertasPendientesProps) {
  const [tab, setTab] = useState<'actividades' | 'indicadores'>('actividades');

  if (loading) {
    return (
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
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
          <h3 className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
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
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5" />
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
          <ul className="space-y-1.5">
            {actividades.map((a) => (
              <li key={a.id}>
                <Link href="/proyectos" className="text-sm text-primary hover:underline">
                  {a.name}
                </Link>
                <span className="text-xs text-muted-foreground ml-2">— {a.proyectoNombre}</span>
              </li>
            ))}
            {actividades.length === 0 && (
              <li className="text-sm text-muted-foreground">Ninguna</li>
            )}
          </ul>
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
    </div>
  );
}
