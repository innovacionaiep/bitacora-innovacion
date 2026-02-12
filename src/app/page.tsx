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

export default function HomePage() {
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
      <div className="h-full flex items-center justify-center">
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Cabecera: mismo padding que proyectos; sin scroll */}
      <div className="flex-shrink-0">
        <PortalWelcomeHeader
          rolesVigentes={rolesVigentes}
          onRoleChange={handleRoleChange}
        />
      </div>

      {/* Enlace rápido si no hay roles con proyectos */}
      {rolesVigentes.length === 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-4 mt-4">
          <Link href="/dashboard">
            <Button variant="default">Ir al Dashboard</Button>
          </Link>
          <Link href="/proyectos">
            <Button variant="outline">Ver Proyectos</Button>
          </Link>
        </div>
      )}

      {/* Contenido: scroll solo dentro de los contenedores, no en la ventana */}
      {rolesVigentes.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden mt-6">
          {/* Mis proyectos: altura limitada, scroll interno si hay muchos */}
          <div className="flex-shrink-0 max-h-[260px] min-h-0 overflow-auto">
            <PortalMisProyectos
              proyectos={proyectos}
              loading={loadingPortal}
            />
          </div>

          {/* Grid: columna izquierda y derecha, cada una con su propio scroll */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 overflow-hidden">
            <div className="lg:col-span-2 min-h-0 overflow-auto">
              <div className="space-y-6">
                <PortalAlertasPendientes
                  alertas={alertas}
                  activeRole={activeRole}
                  loading={loadingPortal}
                />
                <PortalProximasReuniones
                  reuniones={reuniones}
                  loading={loadingPortal}
                />
                <PortalCompromisosPendientes
                  compromisos={compromisos}
                  activeRole={activeRole}
                  onSuccess={loadPortalData}
                  loading={loadingPortal}
                />
              </div>
            </div>
            <div className="min-h-0 overflow-auto">
              <PortalHistorialReciente
                historial={historial}
                loading={loadingPortal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
