'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleCompromiso, toggleValidacionCompromiso } from '@/lib/actions/seguimiento';
import {
  ClipboardCheck,
  CircleAlert,
  CheckCircle,
  BadgeCheck,
  Loader2,
} from 'lucide-react';

type CompromisoPortal = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getCompromisosPendientesParaUsuario>
>['data'][number];

const POST_IT_ROJO = 'bg-red-100 border-red-300 shadow-red-200/50';
const POST_IT_AMARILLO = 'bg-amber-100 border-amber-300 shadow-amber-200/50';
const POST_IT_VERDE = 'bg-emerald-100 border-emerald-400 shadow-emerald-300/50';

function getPostItClass(c: CompromisoPortal): string {
  if (c.validadoPorCoordinador) return POST_IT_VERDE;
  if (c.completado) return POST_IT_AMARILLO;
  return POST_IT_ROJO;
}

function EstadoIcon({ compromiso }: { compromiso: CompromisoPortal }) {
  if (compromiso.validadoPorCoordinador)
    return <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />;
  if (compromiso.completado)
    return <CheckCircle className="h-5 w-5 text-amber-600 shrink-0" />;
  return <CircleAlert className="h-5 w-5 text-red-600 shrink-0" />;
}

function tituloDeDescripcion(desc: string, max = 50): string {
  const first = desc.split(/\n/)[0].trim();
  if (!first) return 'Sin título';
  return first.length <= max ? first : first.slice(0, max).trim() + '…';
}

function formatFecha(createdAt: Date | string): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface PortalCompromisosPendientesProps {
  compromisos: CompromisoPortal[];
  activeRole: string | null;
  onSuccess: () => void | Promise<void>;
  loading?: boolean;
}

export function PortalCompromisosPendientes({
  compromisos,
  activeRole,
  onSuccess,
  loading = false,
}: PortalCompromisosPendientesProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isCoordinadorOrAdmin =
    activeRole === 'Coordinador' || activeRole === 'Admin';
  const canMarkRealizado =
    activeRole === 'Coordinador' ||
    activeRole === 'Encargado' ||
    activeRole === 'Admin';

  const handleToggleRealizado = async (id: string) => {
    if (!canMarkRealizado) return;
    setTogglingId(id);
    const result = await toggleCompromiso(id);
    setTogglingId(null);
    if (result.success) await onSuccess();
  };

  const handleToggleValidacion = async (id: string) => {
    if (!isCoordinadorOrAdmin) return;
    setTogglingId(id);
    const result = await toggleValidacionCompromiso(id);
    setTogglingId(null);
    if (result.success) await onSuccess();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Compromisos pendientes
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

  const list = compromisos.filter(
    (c) => c.descripcion && c.descripcion.trim()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Compromisos pendientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay compromisos pendientes.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((c) => {
              const titulo =
                c.titulo?.trim() || tituloDeDescripcion(c.descripcion);
              const proyectoNombre =
                (c as CompromisoPortal & { proyecto?: { proyecto?: string } })
                  .proyecto?.proyecto ?? '';

              return (
                <div
                  key={c.id}
                  className={`rounded-lg border-2 shadow-md p-3 min-h-[120px] flex flex-col text-left ${getPostItClass(c)}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p
                      className="text-sm font-medium flex-1 min-w-0 line-clamp-2 break-words"
                      title={c.descripcion}
                    >
                      {titulo}
                    </p>
                    <EstadoIcon compromiso={c} />
                  </div>
                  {proyectoNombre && (
                    <p className="text-xs text-gray-600 mb-1">
                      {proyectoNombre}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Creado: {formatFecha(c.createdAt)}
                  </p>
                  <div
                    className="flex flex-wrap gap-3 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      {togglingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={c.completado}
                          onCheckedChange={() => handleToggleRealizado(c.id)}
                          disabled={!canMarkRealizado}
                          className="border-gray-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-600"
                        />
                      )}
                      Realizado
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      {togglingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={c.validadoPorCoordinador}
                          onCheckedChange={() => handleToggleValidacion(c.id)}
                          disabled={!isCoordinadorOrAdmin}
                          className="border-gray-400/60 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-700"
                        />
                      )}
                      Validado
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
