'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  PortalWelcomeHeader,
  PortalMisProyectos,
  PortalAlertasPendientes,
  PortalProximasReuniones,
  PortalCompromisosPendientes,
  PortalHistorialReciente,
} from '@/components/portal';
import {
  getRolesConProyectosVigentes,
  getProyectosDelUsuarioConRol,
  getAlertasPortalUsuario,
} from '@/lib/actions/portal-inicio';
import { getCompromisosPendientesParaUsuario, getProximasReunionesParaUsuario } from '@/lib/actions/seguimiento';
import { getHistorialRecienteParaUsuario } from '@/lib/actions/historial';
import { Loader2 } from 'lucide-react';

export default function InicioPage() {
  const { data: session, status } = useSession();
  const [rolesVigentes, setRolesVigentes] = useState<string[]>([]);
  const [proyectos, setProyectos] = useState<
    Awaited<ReturnType<typeof getProyectosDelUsuarioConRol>>['data']
  >([]);
  const [alertas, setAlertas] = useState<
    Awaited<ReturnType<typeof getAlertasPortalUsuario>>['data']
  >(null);
  const [reuniones, setReuniones] = useState<
    Awaited<ReturnType<typeof getProximasReunionesParaUsuario>>['data']
  >([]);
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosPendientesParaUsuario>>['data']
  >([]);
  const [historial, setHistorial] = useState<
    Awaited<ReturnType<typeof getHistorialRecienteParaUsuario>>['data']
  >([]);
  const [loadingPortal, setLoadingPortal] = useState(true);
  const [loadingProyectos, setLoadingProyectos] = useState(true);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [loadingReuniones, setLoadingReuniones] = useState(true);
  const [loadingCompromisos, setLoadingCompromisos] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [displayRole, setDisplayRole] = useState<string | null>(null);
  const lastLoadedRoleRef = useRef<string | null>(null);
  const isRoleChangeInProgressRef = useRef(false);
  const syncClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeRole = session?.user?.activeRole ?? null;
  const roleToLoad = activeRole ?? rolesVigentes[0] ?? null;

  const loadRoles = useCallback(async () => {
    const res = await getRolesConProyectosVigentes();
    if (res.success && res.data) {
      setRolesVigentes(res.data);
    }
  }, []);

  const loadPortalData = useCallback(
    async (role: string | null, options?: { isRoleChange?: boolean }) => {
      const isRoleChange = options?.isRoleChange === true;
      setDisplayRole(role);
      if (isRoleChange) {
        // Solo spinners dentro de cada tarjeta; la página no se recarga
        setLoadingProyectos(true);
        setLoadingAlertas(true);
        setLoadingReuniones(true);
        setLoadingCompromisos(true);
        setLoadingHistorial(true);
      } else {
        // Carga inicial: loading global + por sección
        setLoadingPortal(true);
        setLoadingProyectos(true);
        setLoadingAlertas(true);
        setLoadingReuniones(true);
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
      const reunionesPromise = getProximasReunionesParaUsuario(role, 10).then((r) => {
        if (r.success && r.data) setReuniones(r.data);
        setLoadingReuniones(false);
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

      try {
        await Promise.all([
          proyPromise,
          alertasPromise,
          reunionesPromise,
          compromisosPromise,
          historialPromise,
        ]);
      } finally {
        setLoadingPortal(false);
      }
    },
    []
  );

  useEffect(() => {
    if (status === 'loading') return;
    loadRoles();
  }, [status, loadRoles]);

  useEffect(() => {
    if (status === 'authenticated' && roleToLoad != null && roleToLoad === lastLoadedRoleRef.current && isRoleChangeInProgressRef.current) {
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
    lastLoadedRoleRef.current = roleToLoad;
    loadPortalData(roleToLoad);
  }, [status, roleToLoad, loadPortalData]);

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

  // Sincronizar portal cuando el rol activo cambia desde fuera (p. ej. Mi Cuenta)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.activeRole) return;
    const newRole = session.user.activeRole;
    if (newRole === lastLoadedRoleRef.current) return;
    if (isRoleChangeInProgressRef.current) return;
    lastLoadedRoleRef.current = newRole;
    isRoleChangeInProgressRef.current = true;
    loadPortalData(newRole, { isRoleChange: true });
  }, [status, session?.user?.activeRole, loadPortalData]);

  // Spinner de pantalla completa solo en la carga inicial; si ya mostramos el portal,
  // no volver al spinner cuando la sesión refetch (update()) para evitar parpadeos.
  if (status === 'loading' && displayRole == null) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== 'authenticated' || !session?.user) {
    if (status === 'loading' && displayRole != null) {
      // Refetch de sesión: mantener portal visible, no mostrar login
    } else {
      return (
        <div className="h-full overflow-auto">
          <div className="space-y-8 w-full max-w-2xl mx-auto text-center py-12">
            <h1 className="text-4xl font-bold tracking-tight">
              Bienvenido a Bemindr
            </h1>
            <p className="text-muted-foreground">
              Inicia sesión para acceder a tu portal de proyectos.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button size="lg">Iniciar sesión</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  // Siempre mostrar el portal completo (secciones visibles; vacías o cargando si no hay datos)
  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100">
      <div className="flex-shrink-0">
        <PortalWelcomeHeader
          rolesVigentes={rolesVigentes}
          onRoleChange={handleRoleChange}
        />
      </div>

      {/* Contenido: grid unificado para que Últimas, Reuniones y Compromisos tengan el mismo ancho */}
      <div className="flex-1 min-h-0 grid grid-cols-[1.5fr_1fr] gap-4 mt-4 overflow-visible">
        {/* Col 1: Mis proyectos (arriba) + Alertas (abajo) */}
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-visible">
          <div className="h-[262px] shrink-0 p-2 overflow-visible">
            <PortalMisProyectos proyectos={proyectos} loading={loadingProyectos} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalAlertasPendientes
              alertas={alertas}
              activeRole={displayRole ?? activeRole}
              loading={loadingAlertas}
              onSuccess={() => loadPortalData(displayRole ?? roleToLoad, { isRoleChange: true })}
            />
          </div>
        </div>
        {/* Col 2: Últimas actualizaciones | Próximas reuniones | Compromisos pendientes (mismo ancho) */}
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-visible">
          <div className="h-[262px] shrink-0 p-2 overflow-visible">
            <PortalHistorialReciente historial={historial} loading={loadingHistorial} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalProximasReuniones
              reuniones={reuniones}
              loading={loadingReuniones}
            />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalCompromisosPendientes
              compromisos={compromisos}
              activeRole={displayRole ?? activeRole}
              onSuccess={() => loadPortalData(displayRole ?? roleToLoad, { isRoleChange: true })}
              loading={loadingCompromisos}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
