'use client';

import { usePathname } from 'next/navigation';
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

  // Rutas que NO deben mostrar sidebar
  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

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
