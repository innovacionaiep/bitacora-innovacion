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
  const [displayRole, setDisplayRole] = useState<string | null>(
    initialData?.role ?? null
  );
  const lastLoadedRoleRef = useRef<string | null>(initialData?.role ?? null);
  const isRoleChangeInProgressRef = useRef(false);
  const syncClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeRole = session?.user?.activeRole ?? null;
  const availableRoles = session?.user?.availableRoles ?? [];
  const roleToLoad = activeRole ?? availableRoles[0] ?? null;

  const loadPortalData = useCallback(
    async (role: string | null, options?: { isRoleChange?: boolean }) => {
      const isRoleChange = options?.isRoleChange === true;
      setDisplayRole(role);
      if (isRoleChange) {
        // Solo spinners dentro de cada tarjeta; la página no se recarga
        setLoadingProyectos(true);
        setLoadingAlertas(true);
        setLoadingCompromisos(true);
        setLoadingHistorial(true);
      } else {
        // Carga inicial: loading por sección
        setLoadingProyectos(true);
        setLoadingAlertas(true);
        setLoadingCompromisos(true);
        setLoadingHistorial(true);
      }

      const proyPromise = getProyectosDelUsuarioConRol(role).then((r) => {
        if (r.success && r.data) setProyectos(r.data);
        setLoadingProyectos(false);
        return r;
      });
      const alertasPromise = getAlertasPortalUsuario(role).then((r) => {
        if (r.success) setAlertas(r.data);
        setLoadingAlertas(false);
        return r;
      });
      const compromisosPromise = getCompromisosPendientesParaUsuario(role).then((r) => {
        if (r.success && r.data) setCompromisos(r.data);
        setLoadingCompromisos(false);
        return r;
      });
      const historialPromise = getHistorialRecienteParaUsuario(role, 10).then((r) => {
        if (r.success && r.data) setHistorial(r.data);
        setLoadingHistorial(false);
        return r;
      });

      await Promise.all([
        proyPromise,
        alertasPromise,
        compromisosPromise,
        historialPromise,
      ]);
    },
    []
  );

  useEffect(() => {
    if (
      status === 'authenticated' &&
      roleToLoad != null &&
      roleToLoad === lastLoadedRoleRef.current &&
      isRoleChangeInProgressRef.current
    ) {
      if (syncClearTimeoutRef.current) clearTimeout(syncClearTimeoutRef.current);
      syncClearTimeoutRef.current = setTimeout(() => {
        syncClearTimeoutRef.current = null;
        isRoleChangeInProgressRef.current = false;
      }, 1500);
    }
    if (status !== 'authenticated') return;
    if (roleToLoad == null) return;
    if (roleToLoad === lastLoadedRoleRef.current) return;
    if (isRoleChangeInProgressRef.current) return;
    if (initialData && roleToLoad === initialData.role) return;
    lastLoadedRoleRef.current = roleToLoad;
    loadPortalData(roleToLoad);
  }, [status, roleToLoad, loadPortalData, initialData]);

  const handleRoleChange = useCallback(
    (newRole: string) => {
      if (syncClearTimeoutRef.current) {
        clearTimeout(syncClearTimeoutRef.current);
        syncClearTimeoutRef.current = null;
      }
      lastLoadedRoleRef.current = newRole;
      isRoleChangeInProgressRef.current = true;
      loadPortalData(newRole, { isRoleChange: true });
    },
    [loadPortalData]
  );

  useEffect(() => {
    return () => {
      if (syncClearTimeoutRef.current) clearTimeout(syncClearTimeoutRef.current);
    };
  }, []);

  // Sincronizar portal cuando el rol activo cambia desde la sesión
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.activeRole) return;
    const newRole = session.user.activeRole;
    if (newRole === lastLoadedRoleRef.current) return;
    if (isRoleChangeInProgressRef.current) return;
    lastLoadedRoleRef.current = newRole;
    isRoleChangeInProgressRef.current = true;
    loadPortalData(newRole, { isRoleChange: true });
  }, [status, session?.user?.activeRole, loadPortalData]);

  // Carga inicial de sesión o de datos del portal → barra superior
  usePageTopLoader(
    (status === 'loading' && displayRole == null) ||
      loadingProyectos ||
      loadingAlertas ||
      loadingCompromisos ||
      loadingHistorial
  );

  if (status === 'loading' && displayRole == null) {
    return <div className="h-full min-h-[200px] bg-background" />;
  }

  if (status !== 'authenticated' || !session?.user) {
    if (status === 'loading' && displayRole != null) {
      // Refetch de sesión: mantener portal visible, no mostrar login
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
      <div className="flex-shrink-0">
        <PortalWelcomeHeader onRoleChange={handleRoleChange} />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1.5fr_1fr] gap-4 mt-4 overflow-visible">
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-visible">
          <div className="h-[262px] shrink-0 p-2 overflow-visible">
            <PortalMisProyectos proyectos={proyectos} loading={loadingProyectos} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalAlertasPendientes
              alertas={alertas}
              activeRole={displayRole ?? activeRole}
              loading={loadingAlertas}
              onSuccess={() =>
                loadPortalData(displayRole ?? roleToLoad, { isRoleChange: true })
              }
            />
          </div>
        </div>
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-visible">
          <div className="h-[262px] shrink-0 p-2 overflow-visible">
            <PortalHistorialReciente historial={historial} loading={loadingHistorial} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalCompromisosPendientes
              compromisos={compromisos}
              activeRole={displayRole ?? activeRole}
              onSuccess={() =>
                loadPortalData(displayRole ?? roleToLoad, { isRoleChange: true })
              }
              loading={loadingCompromisos}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
