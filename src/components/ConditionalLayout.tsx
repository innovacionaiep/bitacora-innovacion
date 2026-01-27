'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/ui/SidebarNav';
import ResponsiveMain from '@/components/ResponsiveMain';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Rutas que NO deben mostrar sidebar
  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Ruta de novedades que necesita fondo gris completo
  const isNovedadesRoute = pathname === '/novedades';

  // Si es una ruta de autenticación, mostrar solo el contenido
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Para todas las demás rutas, mostrar el layout completo con sidebar
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <SidebarProvider defaultOpen={true}>
        <SidebarNav />
        <ResponsiveMain>
          <div className={`flex flex-col flex-1 h-full overflow-x-hidden ${isNovedadesRoute ? '' : 'overflow-y-auto p-4 pt-2'}`}>
            {children}
          </div>
        </ResponsiveMain>
      </SidebarProvider>
    </div>
  );
}
