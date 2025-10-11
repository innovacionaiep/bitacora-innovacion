'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/ui/SidebarNav';
import PageHeader from '@/components/PageHeader';
import PageHeaderSimple from '@/components/PageHeaderSimple';
import ResponsiveMain from '@/components/ResponsiveMain';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Rutas que NO deben mostrar sidebar y header
  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Ruta de perfil - solo header simplificado sin sidebar
  const isProfileRoute = pathname === '/perfil';

  // Si es una ruta de autenticación, mostrar solo el contenido
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // Si es la página de perfil, mostrar header simplificado sin sidebar
  if (isProfileRoute) {
    return (
      <div className="h-screen flex flex-col bg-background text-foreground">
        <PageHeaderSimple />
        {children}
      </div>
    );
  }

  // Para todas las demás rutas, mostrar el layout completo con sidebar y header
  return (
    <div className="flex h-screen bg-background text-foreground">
      <SidebarProvider defaultOpen={true}>
        <SidebarNav />
        <ResponsiveMain>
          <PageHeader />
          <div className="flex-1 overflow-y-auto p-6 pt-8">
            <div className="w-full">{children}</div>
          </div>
        </ResponsiveMain>
      </SidebarProvider>
    </div>
  );
}
