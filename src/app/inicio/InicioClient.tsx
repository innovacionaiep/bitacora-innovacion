'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  PortalWelcomeHeader,
  PortalMisProyectos,
  PortalAlertasPendientes,
  PortalCompromisosPendientes,
  PortalHistorialReciente,
  InicioTour,
  type InicioTourHandle,
} from '@/components/portal';
import {
  getProyectosDelUsuarioConRol,
  getAlertasPortalUsuario,
  type InicioInitialData,
} from '@/lib/actions/portal-inicio';
import { getCompromisosPendientesParaUsuario } from '@/lib/actions/seguimiento';
import { getHistorialRecienteParaUsuario } from '@/lib/actions/historial';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

export function InicioClient({
  initialData,
}: {
  initialData?: InicioInitialData | null;
}) {
  const { data: session, status } = useSession();
  const tourRef = useRef<InicioTourHandle>(null);
  const [proyectos, setProyectos] = useState<
    Awaited<ReturnType<typeof getProyectosDelUsuarioConRol>>['data']
  >(initialData?.proyectos ?? []);
  const [alertas, setAlertas] = useState<
    Awaited<ReturnType<typeof getAlertasPortalUsuario>>['data']
  >(initialData?.alertas ?? null);
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosPendientesParaUsuario>>['data']
  >(initialData?.compromisos ?? []);
  const [historial, setHistorial] = useState<
    Awaited<ReturnType<typeof getHistorialRecienteParaUsuario>>['data']
  >(initialData?.historial ?? []);
  const [loadingProyectos, setLoadingProyectos] = useState(!initialData);
  const [loadingAlertas, setLoadingAlertas] = useState(!initialData);
  const [loadingCompromisos, setLoadingCompromisos] = useState(!initialData);
  const [loadingHistorial, setLoadingHistorial] = useState(!initialData);
  const hasLoadedRef = useRef(Boolean(initialData));

  const loadPortalData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoadingProyectos(true);
      setLoadingAlertas(true);
      setLoadingCompromisos(true);
      setLoadingHistorial(true);
    }

    await Promise.all([
      getProyectosDelUsuarioConRol().then((r) => {
        if (r.success && r.data) setProyectos(r.data);
        if (!silent) setLoadingProyectos(false);
      }),
      getAlertasPortalUsuario().then((r) => {
        if (r.success) setAlertas(r.data);
        if (!silent) setLoadingAlertas(false);
      }),
      getCompromisosPendientesParaUsuario().then((r) => {
        if (r.success && r.data) setCompromisos(r.data);
        if (!silent) setLoadingCompromisos(false);
      }),
      getHistorialRecienteParaUsuario(null, 10).then((r) => {
        if (r.success && r.data) setHistorial(r.data);
        if (!silent) setLoadingHistorial(false);
      }),
    ]);
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (hasLoadedRef.current) return;
    void loadPortalData();
  }, [status, loadPortalData]);

  usePageTopLoader(
    status === 'loading' ||
      loadingProyectos ||
      loadingAlertas ||
      loadingCompromisos ||
      loadingHistorial
  );

  if (status === 'loading' && !initialData) {
    return <div className="h-full min-h-[200px] bg-background" />;
  }

  if (status !== 'authenticated' || !session?.user) {
    if (status === 'loading') {
      // keep portal if we have SSR data
    } else {
      return (
        <div className="h-full overflow-auto bg-background">
          <div className="space-y-6 w-full max-w-2xl mx-auto text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight">
              Bienvenido a Bitácora
            </h1>
            <p className="text-[13px] text-gray-500 tracking-wide">
              Inicia sesión para acceder a tu portal de proyectos.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="h-9 rounded-md border border-gray-200 bg-white text-[13px] font-medium tracking-wide text-gray-600 hover:bg-gray-50 hover:text-emerald-700"
                  variant="outline"
                >
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-9 rounded-md border border-gray-200 bg-white text-[13px] font-medium tracking-wide text-gray-600 hover:bg-gray-50 hover:text-emerald-700"
                >
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <InicioTour ref={tourRef} />
      <div className="flex-shrink-0">
        <PortalWelcomeHeader
          onStartTour={() => tourRef.current?.startTour()}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4 mt-4 overflow-hidden">
        <div className="h-[262px] shrink-0 grid grid-cols-[1.5fr_1fr] gap-4 min-h-0 overflow-hidden">
          <div
            id="tour-mis-proyectos"
            className="min-w-0 min-h-0 h-full p-2 overflow-hidden"
          >
            <PortalMisProyectos proyectos={proyectos} loading={loadingProyectos} />
          </div>
          <div
            id="tour-historial"
            className="min-w-0 min-h-0 h-full p-2 overflow-hidden"
          >
            <PortalHistorialReciente historial={historial} loading={loadingHistorial} />
          </div>
        </div>
        <div id="tour-alertas" className="flex-1 min-h-0 overflow-auto p-2">
          <PortalAlertasPendientes
            alertas={alertas}
            loading={loadingAlertas}
            onSuccess={() => void loadPortalData({ silent: true })}
            extraColumn={
              <PortalCompromisosPendientes
                compromisos={compromisos}
                activeRole={null}
                onSuccess={() => void loadPortalData({ silent: true })}
                loading={loadingCompromisos}
                variant="column"
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
