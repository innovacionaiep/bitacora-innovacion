'use client';

import { useEffect, useState, useTransition } from 'react';
import { Wrench } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  getMaintenanceEnabled,
  setMaintenanceEnabled,
} from '@/lib/actions/maintenance-config';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

const isLocalDev = process.env.NODE_ENV === 'development';

export default function MantenimientoClient() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  usePageTopLoader(loading || pending);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = await getMaintenanceEnabled();
        if (!cancelled) setEnabled(value);
      } catch {
        if (!cancelled) setError('No se pudo cargar el estado de mantenimiento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = (next: boolean) => {
    setError(null);
    const prev = enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setMaintenanceEnabled(next);
      if (!result.success) {
        setEnabled(prev);
        setError(result.error ?? 'Error al guardar');
        return;
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto pt-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
            <Wrench className="h-5 w-5 text-amber-700" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mantenimiento</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Al activarlo, todos los usuarios (excepto Admin en este panel) son
              redirigidos a la página de mantenimiento y las APIs responden 503.
              El bloqueo solo se aplica en producción.
            </p>
          </div>
        </div>

        {isLocalDev && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Estás en desarrollo local: el bloqueo de rutas no se aplica aquí. Si
            esta base de datos es la misma que producción, activar el switch sí
            afectará el entorno productivo.
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="maintenance-switch" className="text-sm font-medium">
                Página de mantenimiento
              </Label>
              <p className="text-xs text-gray-500">
                {loading
                  ? 'Cargando…'
                  : enabled
                    ? 'Activa — la app está bloqueada para el resto de usuarios'
                    : 'Inactiva — la app funciona con normalidad'}
              </p>
            </div>
            <Switch
              id="maintenance-switch"
              checked={enabled}
              disabled={loading || pending}
              onCheckedChange={onToggle}
            />
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
