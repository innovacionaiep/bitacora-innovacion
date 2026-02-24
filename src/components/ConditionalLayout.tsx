'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/ui/SidebarNav';
import ResponsiveMain from '@/components/ResponsiveMain';
import { MeetingLiveProvider } from '@/contexts/MeetingLiveContext';
import {
  MeetingLiveFloatingWidget,
  MeetingLiveTranscriptionRunner,
} from '@/components/meeting-live/MeetingLiveFloatingWidget';

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

  // Encargado solo puede acceder a Inicio y Proyectos; el resto se redirige a /inicio
  const activeRole = session?.user?.activeRole ?? null;
  const isEncargado = activeRole === 'Encargado';
  const rutaPermitidaEncargado =
    pathname === '/inicio' || pathname.startsWith('/proyectos');
  const encargadoEnRutaBloqueada = isEncargado && !rutaPermitidaEncargado;

  useEffect(() => {
    if (status === 'loading' || isAuthRoute) return;
    if (encargadoEnRutaBloqueada) {
      router.replace('/inicio');
    }
  }, [status, isAuthRoute, encargadoEnRutaBloqueada, router]);

  // Ruta de novedades que necesita fondo gris completo
  const isNovedadesRoute = pathname === '/novedades';

  // Página de Inicio (portal): sin scroll de ventana y márgenes cómodos
  const isInicioRoute = pathname === '/inicio';

  // Márgenes de página: p-8 en todas excepto novedades
  const contentPadding = isNovedadesRoute ? '' : 'pt-8 pl-8 pr-8 pb-8';
  const contentOverflow =
    isNovedadesRoute ? '' : isInicioRoute ? 'overflow-visible' : 'overflow-y-auto';
  const contentBg = isInicioRoute ? 'bg-gray-100' : '';

  const contentClassName = `flex flex-col flex-1 h-full overflow-x-hidden ${contentPadding} ${contentOverflow} ${contentBg}`.trim();

  // Si es una ruta de autenticación, mostrar solo el contenido
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Encargado en ruta no permitida: no mostrar contenido hasta que redirija
  if (encargadoEnRutaBloqueada) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Para todas las demás rutas, mostrar el layout completo con sidebar + widget reunión en vivo
  return (
    <MeetingLiveProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <SidebarProvider defaultOpen={true}>
          <SidebarNav />
          <ResponsiveMain className={isInicioRoute ? 'overflow-visible' : undefined}>
            <div className={contentClassName}>
              {children}
            </div>
          </ResponsiveMain>
        </SidebarProvider>
      </div>
      <MeetingLiveTranscriptionRunner />
      <MeetingLiveFloatingWidget />
    </MeetingLiveProvider>
  );
}
