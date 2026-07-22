'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import SidebarNav from '@/components/ui/SidebarNav';
import ResponsiveMain from '@/components/ResponsiveMain';
import { ChatSoporteFloatingWidget } from '@/components/support-chat/ChatSoporteFloatingWidget';
import { ActiveRolePermissionsProvider } from '@/components/permissions/ActiveRolePermissionsProvider';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import { viewPermissionForPath } from '@/lib/permissions/catalog';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

function ConditionalLayoutInner({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { can, loading: permsLoading } = useActiveRolePermissions();

  const authRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  const viewKey = viewPermissionForPath(pathname);
  const faltaPermisoVista =
    !isAuthRoute &&
    status === 'authenticated' &&
    !permsLoading &&
    viewKey != null &&
    !can(viewKey);

  useEffect(() => {
    if (status === 'loading' || isAuthRoute || permsLoading) return;
    // Evitar bucle: si ya estamos en /inicio sin permiso, no replace a sí mismo
    if (faltaPermisoVista && pathname !== '/inicio') {
      router.replace('/inicio');
    }
  }, [status, isAuthRoute, permsLoading, faltaPermisoVista, pathname, router]);

  const isNovedadesRoute = pathname === '/novedades';
  const isInicioRoute = pathname === '/inicio';
  const isProyectosRoute = pathname.startsWith('/proyectos');

  const contentPadding = isNovedadesRoute
    ? ''
    : isProyectosRoute
      ? 'pt-2 pl-8 pr-8 pb-8'
      : 'pt-8 pl-8 pr-8 pb-8';
  const contentOverflow =
    isNovedadesRoute ? '' : isInicioRoute ? 'overflow-visible' : 'overflow-hidden';
  const contentBg = isInicioRoute ? 'bg-background' : '';

  const contentClassName = `flex flex-col flex-1 h-full min-h-0 overflow-x-hidden ${contentPadding} ${contentOverflow} ${contentBg}`.trim();

  if (isAuthRoute) {
    return <div className="h-full min-h-screen">{children}</div>;
  }

  // Spinner solo en carga inicial de permisos o si falta permiso (y no estamos en /inicio)
  if (
    (status === 'authenticated' && permsLoading && viewKey) ||
    (faltaPermisoVista && pathname !== '/inicio')
  ) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  return (
    <ActiveRolePermissionsProvider>
      <ConditionalLayoutInner>{children}</ConditionalLayoutInner>
    </ActiveRolePermissionsProvider>
  );
}
