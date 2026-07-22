'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/ui/SidebarNav';
import ResponsiveMain from '@/components/ResponsiveMain';
import { ChatSoporteFloatingWidget } from '@/components/support-chat/ChatSoporteFloatingWidget';
import {
  isRutaDashboardReportes,
  ROLES_SIN_DASHBOARD_REPORTES,
  type Role,
} from '@/lib/auth-utils';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Rutas que NO deben mostrar sidebar
  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Encargado, Estudiante y Docente solo pueden acceder a Inicio y Proyectos; el resto se redirige a /inicio
  const activeRole = session?.user?.activeRole ?? null;
  const ROLES_SOLO_INICIO_PROYECTOS = ['Encargado', 'Estudiante', 'Docente'];
  const isRolAccesoLimitado =
    activeRole != null && ROLES_SOLO_INICIO_PROYECTOS.includes(activeRole);
  const rutaPermitidaLimitada =
    pathname === '/inicio' || pathname.startsWith('/proyectos');
  const rolLimitadoEnRutaBloqueada =
    isRolAccesoLimitado && !rutaPermitidaLimitada;

  const bloqueoDashboardReportes =
    activeRole != null &&
    ROLES_SIN_DASHBOARD_REPORTES.includes(activeRole as Role) &&
    isRutaDashboardReportes(pathname);

  const debeRedirigir = rolLimitadoEnRutaBloqueada || bloqueoDashboardReportes;

  useEffect(() => {
    if (status === 'loading' || isAuthRoute) return;
    if (debeRedirigir) {
      router.replace('/inicio');
    }
  }, [status, isAuthRoute, debeRedirigir, router]);

  // Ruta de novedades que necesita fondo gris completo
  const isNovedadesRoute = pathname === '/novedades';

  // Página de Inicio (portal): sin scroll de ventana y márgenes cómodos
  const isInicioRoute = pathname === '/inicio';

  // Proyectos: menos padding superior para la botonera centrada al tope
  const isProyectosRoute = pathname.startsWith('/proyectos');

  // Márgenes de página: p-8 en todas excepto novedades; proyectos con pt reducido
  // Sin scroll de página: overflow-hidden (inicio: overflow-visible por portales/dropdowns)
  const contentPadding = isNovedadesRoute
    ? ''
    : isProyectosRoute
      ? 'pt-2 pl-8 pr-8 pb-8'
      : 'pt-8 pl-8 pr-8 pb-8';
  const contentOverflow =
    isNovedadesRoute ? '' : isInicioRoute ? 'overflow-visible' : 'overflow-hidden';
  const contentBg = isInicioRoute ? 'bg-gray-100' : '';

  const contentClassName = `flex flex-col flex-1 h-full min-h-0 overflow-x-hidden ${contentPadding} ${contentOverflow} ${contentBg}`.trim();

  // Si es una ruta de autenticación, wrapper con h-full para llenar el contenedor escalado
  if (isAuthRoute) {
    return <div className="h-full min-h-screen">{children}</div>;
  }

  // Rol con acceso limitado en ruta no permitida: no mostrar contenido hasta que redirija
  if (debeRedirigir) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Para todas las demás rutas: h-full para llenar DesktopScaleCompensate cuando DPR > 1
  return (
    <>
      <div className="flex h-full min-h-screen bg-background text-foreground overflow-hidden">
        <SidebarProvider expandOnHover>
          <SidebarNav />
          <ResponsiveMain className={isInicioRoute ? 'overflow-visible' : undefined}>
            <div className={contentClassName}>
              {isNovedadesRoute ? (
                children
              ) : (
                <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col overflow-hidden">
                  {children}
                </div>
              )}
            </div>
          </ResponsiveMain>
        </SidebarProvider>
      </div>
      {pathname !== '/soporte' && <ChatSoporteFloatingWidget />}
    </>
  );
}
