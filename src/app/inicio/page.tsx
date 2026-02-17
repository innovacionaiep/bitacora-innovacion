'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(true);

  const activeRole = session?.user?.activeRole ?? null;

  const loadRoles = useCallback(async () => {
    const res = await getRolesConProyectosVigentes();
    if (res.success && res.data) {
      setRolesVigentes(res.data);
    }
  }, []);

  const loadPortalData = useCallback(async () => {
    setLoadingPortal(true);
    const role = activeRole;
    const [proyRes, alertasRes, reunionesRes, compromisosRes, historialRes] =
      await Promise.all([
        getProyectosDelUsuarioConRol(role),
        getAlertasPortalUsuario(role),
        getProximasReunionesParaUsuario(role, 10),
        getCompromisosPendientesParaUsuario(role),
        getHistorialRecienteParaUsuario(role, 10),
      ]);
    if (proyRes.success && proyRes.data) setProyectos(proyRes.data);
    if (alertasRes.success) setAlertas(alertasRes.data);
    if (reunionesRes.success && reunionesRes.data) setReuniones(reunionesRes.data);
    if (compromisosRes.success && compromisosRes.data)
      setCompromisos(compromisosRes.data);
    if (historialRes.success && historialRes.data)
      setHistorial(historialRes.data);
    setLoadingPortal(false);
  }, [activeRole]);

  useEffect(() => {
    if (status === 'loading') return;
    setLoading(false);
    loadRoles();
  }, [status, loadRoles]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    loadPortalData();
  }, [status, activeRole, loadPortalData]);

  const handleRoleChange = useCallback(() => {
    loadPortalData();
  }, [loadPortalData]);

  if (status === 'loading' || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== 'authenticated' || !session?.user) {
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

  if (rolesVigentes.length === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-gray-100">
        <div className="flex-shrink-0">
          <PortalWelcomeHeader
            rolesVigentes={rolesVigentes}
            onRoleChange={handleRoleChange}
          />
        </div>
        <div className="flex-shrink-0 flex flex-wrap gap-4 mt-4">
          <Link href="/dashboard">
            <Button variant="default">Ir al Dashboard</Button>
          </Link>
          <Link href="/proyectos">
            <Button variant="outline">Ver Proyectos</Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalMisProyectos proyectos={proyectos} loading={loadingPortal} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalAlertasPendientes
              alertas={alertas}
              activeRole={activeRole}
              loading={loadingPortal}
              onSuccess={loadPortalData}
            />
          </div>
        </div>
        {/* Col 2: Últimas actualizaciones | Próximas reuniones | Compromisos pendientes (mismo ancho) */}
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-visible">
          <div className="flex-[1.15] min-h-0 p-2 overflow-visible">
            <PortalHistorialReciente historial={historial} loading={loadingPortal} />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalProximasReuniones
              reuniones={reuniones}
              loading={loadingPortal}
            />
          </div>
          <div className="flex-1 min-h-0 p-2 overflow-visible">
            <PortalCompromisosPendientes
              compromisos={compromisos}
              activeRole={activeRole}
              onSuccess={loadPortalData}
              loading={loadingPortal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
