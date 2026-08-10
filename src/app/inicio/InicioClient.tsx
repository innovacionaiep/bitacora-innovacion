'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  PortalWelcomeHeader,
  PortalMisProyectos,
  PortalAlertasPendientes,
  PortalCompromisosPendientes,
  PortalHistorialReciente,
} from '@/components/portal';
import {
  getInicioInitialData,
  getProyectosDelUsuarioConRol,
  getAlertasPortalUsuario,
  type InicioInitialData,
} from '@/lib/actions/portal-inicio';
import { getCompromisosPendientesParaUsuario } from '@/lib/actions/seguimiento';
import { getHistorialRecienteParaUsuario } from '@/lib/actions/historial';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

type InicioTourHandle = { startTour: () => void };

const InicioTour = dynamic(
  () =>
    import('@/components/portal/InicioTour').then((m) => m.InicioTour),
  { ssr: false }
);

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

  const loadPortalData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoadingProyectos(true);
      setLoadingAlertas(true);
      setLoadingCompromisos(true);
      setLoadingHistorial(true);
    }

    const data = await getInicioInitialData();
    if (data) {
      setProyectos(data.proyectos ?? []);
      setAlertas(data.alertas);
      setCompromisos(data.compromisos ?? []);
      setHistorial(data.historial ?? []);
    }
    if (!silent) {
      setLoadingProyectos(false);
      setLoadingAlertas(false);
      setLoadingCompromisos(false);
      setLoadingHistorial(false);
    }
  }, []);

  // Only fetch when SSR did not provide data (unauthenticated SSR → login then hydrate)
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (initialData) return;
    void loadPortalData({ silent: false });
  }, [status, initialData, loadPortalData]);

  // Soft refresh when returning to the tab (mutations elsewhere may have changed portal data)
  useEffect(() => {
    if (status !== 'authenticated' || !initialData) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void loadPortalData({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [status, initialData, loadPortalData]);

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
        <div className="h-[262px] shrink-0 grid grid-cols-[2fr_1fr] gap-4 min-h-0 overflow-hidden">
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
        <div id="tour-alertas" className="flex-1 min-h-0 overflow-hidden p-2">
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
