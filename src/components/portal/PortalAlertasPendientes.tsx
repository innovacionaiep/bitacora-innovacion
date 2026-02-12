'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ClipboardCheck,
  FileCheck,
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
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alertas pendientes
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

  const isCoordinador = activeRole === 'Coordinador';
  const isEncargado = activeRole === 'Encargado';

  if (!isCoordinador && !isEncargado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alertas pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Las alertas están disponibles para los roles Coordinador y Encargado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const coordActividades = alertas?.coordinador?.actividadesPorValidar ?? [];
  const coordIndicadores = alertas?.coordinador?.indicadoresPorValidar ?? [];
  const encActividades = alertas?.encargado?.actividadesPorEvidenciar ?? [];
  const encIndicadores = alertas?.encargado?.indicadoresPorEvidenciar ?? [];

  const hasAny =
    coordActividades.length > 0 ||
    coordIndicadores.length > 0 ||
    encActividades.length > 0 ||
    encIndicadores.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Alertas pendientes
          {activeRole && (
            <Badge variant="secondary" className="text-xs">
              {activeRole}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAny && (
          <p className="text-muted-foreground text-sm">
            No hay alertas pendientes para el rol seleccionado.
          </p>
        )}

        {isCoordinador && (
          <>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <ClipboardCheck className="h-4 w-4" />
                Actividades por validar
              </h4>
              <ul className="space-y-1.5">
                {coordActividades.map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/proyectos"
                      className="text-sm text-primary hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {a.proyectoNombre}
                    </span>
                  </li>
                ))}
                {coordActividades.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Ninguna
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4" />
                Indicadores por validar
              </h4>
              <ul className="space-y-1.5">
                {coordIndicadores.map((i) => (
                  <li key={i.id}>
                    <Link
                      href="/proyectos"
                      className="text-sm text-primary hover:underline"
                    >
                      {i.nombre}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {i.proyectoNombre}
                    </span>
                  </li>
                ))}
                {coordIndicadores.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Ninguno
                  </li>
                )}
              </ul>
            </div>
          </>
        )}

        {isEncargado && (
          <>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <ImagePlus className="h-4 w-4" />
                Actividades por evidenciar
              </h4>
              <ul className="space-y-1.5">
                {encActividades.map((a) => (
                  <li key={a.id}>
                    <Link
                      href="/proyectos"
                      className="text-sm text-primary hover:underline"
                    >
                      {a.name}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {a.proyectoNombre}
                    </span>
                  </li>
                ))}
                {encActividades.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Ninguna
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                <FileCheck className="h-4 w-4" />
                Indicadores por evidenciar
              </h4>
              <ul className="space-y-1.5">
                {encIndicadores.map((i) => (
                  <li key={i.id}>
                    <Link
                      href="/proyectos"
                      className="text-sm text-primary hover:underline"
                    >
                      {i.nombre}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {i.proyectoNombre}
                    </span>
                  </li>
                ))}
                {encIndicadores.length === 0 && (
                  <li className="text-sm text-muted-foreground">
                    Ninguno
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
