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

  // Página de Inicio: mismo padding que proyectos pero sin scroll de ventana (scroll interno)
  const isInicioRoute = pathname === '/';

  // Mismo padding que la página de proyectos: pt-2 pr-4 pb-4 pl-0 (no en novedades)
  const contentPadding = isNovedadesRoute ? '' : 'pt-2 pr-4 pb-4 pl-0';
  const contentOverflow =
    isNovedadesRoute ? '' : isInicioRoute ? 'overflow-hidden' : 'overflow-y-auto';

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
          <ResponsiveMain>
            <div
              className={`flex flex-col flex-1 h-full overflow-x-hidden ${contentPadding} ${contentOverflow}`}
            >
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
