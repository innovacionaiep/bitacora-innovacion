'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import './sidebar-smooth.css';
import {
  Home,
  LayoutDashboard,
  FolderKanban,
  AtSign,
  Settings,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { ROLES_SIN_DASHBOARD_REPORTES, type Role } from '@/lib/auth-utils';

const inter = Inter({ subsets: ['latin'], weight: ['700'] }); // Bold para el título

// Roles que solo ven Inicio y Proyectos en el sidebar (Encargado, Estudiante, Docente)
const ROLES_SOLO_INICIO_PROYECTOS = ['Encargado', 'Estudiante', 'Docente'];
const RUTAS_PERMITIDAS_LIMITADAS = ['/inicio', '/proyectos'];
const RUTAS_DASHBOARD_REPORTES = ['/dashboard', '/reportes'];

const LOGO_EXPANDED_W = 112;
const LOGO_COLLAPSED_PX = 40;

// Novedades está oculto para todos los perfiles; solo Admin puede acceder por URL con contraseña
const navItemsBase = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/reportes', label: 'Reportes', icon: AtSign },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole ?? null;
  const isCollapsed = state === 'collapsed';

  const navItems = navItemsBase
    .filter((item) => {
      const rolesRequeridos: string[] | null =
        'rolesRequeridos' in item && Array.isArray((item as { rolesRequeridos?: unknown }).rolesRequeridos)
          ? ((item as { rolesRequeridos: string[] }).rolesRequeridos)
          : null;
      if (!rolesRequeridos) return true;
      return activeRole !== null && rolesRequeridos.includes(activeRole);
    })
    .filter((item) => {
      // Encargado, Estudiante y Docente solo ven Inicio y Proyectos
      if (activeRole && ROLES_SOLO_INICIO_PROYECTOS.includes(activeRole)) {
        return RUTAS_PERMITIDAS_LIMITADAS.includes(item.href);
      }
      // Docente y Colaborador no ven Dashboard ni Reportes
      if (
        activeRole &&
        ROLES_SIN_DASHBOARD_REPORTES.includes(activeRole as Role)
      ) {
        return !RUTAS_DASHBOARD_REPORTES.includes(item.href);
      }
      return true;
    });

  const showConfig = activeRole === 'Admin';

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="flex flex-col overflow-x-hidden">
      {/* Título centrado; cambia con data-state (al inicio de la animación de ancho) */}
      <SidebarHeader className="flex flex-col items-center justify-center py-6 px-4">
        <div className="flex h-9 w-full items-center justify-center">
          <h1
            className={`${inter.className} text-3xl font-bold leading-none tracking-tight whitespace-nowrap group-data-[state=collapsed]:hidden`}
          >
            Bitácora
          </h1>
          <h1
            className={`${inter.className} text-3xl font-bold leading-none tracking-tight whitespace-nowrap hidden group-data-[state=collapsed]:block`}
          >
            B
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col mt-4 pl-4 pr-4">
        <SidebarMenu className="space-y-3 -ml-[1px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href} className="flex justify-start">
                <SidebarMenuButton
                  asChild
                  tooltip={isCollapsed ? item.label : undefined}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center ${
                      isActive
                        ? 'bg-white text-gray-800 pointer-events-none'
                        : 'text-gray-300 hover:!bg-gray-800 hover:!text-gray-300'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive
                          ? 'text-gray-800'
                          : 'text-gray-300 hover:!text-gray-300'
                      }`}
                    />
                    <span className="ml-3 group-data-[collapsible=icon]:hidden hover:!text-gray-300">
                      {item.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {showConfig && (
            <SidebarMenuItem className="flex justify-start">
              <SidebarMenuButton
                asChild
                tooltip={isCollapsed ? 'Ajustes' : undefined}
              >
                <Link
                  href="/configuracion"
                  className={`flex items-center ${
                    pathname.startsWith('/configuracion')
                      ? 'bg-white text-gray-800 pointer-events-none'
                      : 'text-gray-300 hover:!bg-gray-800 hover:!text-gray-300'
                  }`}
                >
                  <Settings
                    className={`h-5 w-5 shrink-0 ${
                      pathname.startsWith('/configuracion')
                        ? 'text-gray-800'
                        : 'text-gray-300 hover:!text-gray-300'
                    }`}
                  />
                  <span className="ml-3 group-data-[collapsible=icon]:hidden hover:!text-gray-300">
                    Ajustes
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      {/*
        Swap al INICIO de la transición (state inmediato).
        Tamaños fijos en px + shrink-0 para que el flex/padding no los comprima.
        Sin px horizontal en colapsado: pl/pr-4 en sidebar icon (4rem) dejaba ~16–32px
        útiles y el logo “crecía” al expandir.
      */}
      <SidebarFooter
        className={`flex min-w-0 flex-col items-center overflow-visible pt-2 pb-7 ${
          isCollapsed ? 'px-0' : 'px-4'
        }`}
      >
        <div className="flex h-10 w-full items-center justify-center overflow-visible">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png?v=3"
            alt="AIEP de la Universidad Andrés Bello"
            width={LOGO_EXPANDED_W}
            height={36}
            className={`shrink-0 object-contain ${isCollapsed ? 'hidden' : 'block'}`}
            style={{
              width: LOGO_EXPANDED_W,
              minWidth: LOGO_EXPANDED_W,
              maxWidth: LOGO_EXPANDED_W,
              height: 'auto',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logocollapsed.png"
            alt="AIEP"
            width={LOGO_COLLAPSED_PX}
            height={LOGO_COLLAPSED_PX}
            className={`shrink-0 object-contain ${isCollapsed ? 'block' : 'hidden'}`}
            style={{
              width: LOGO_COLLAPSED_PX,
              height: LOGO_COLLAPSED_PX,
              minWidth: LOGO_COLLAPSED_PX,
              maxWidth: LOGO_COLLAPSED_PX,
            }}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
