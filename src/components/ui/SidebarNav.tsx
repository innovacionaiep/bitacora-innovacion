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
  ClipboardCheck,
  ChevronsLeft,
  ChevronsRight,
  AtSign,
  Settings,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { Button } from '@/components/ui/button';
import { SidebarUserInfo } from '@/components/SidebarUserInfo';

const inter = Inter({ subsets: ['latin'], weight: ['700'] }); // Bold para el título

const ROLES_CON_ACCESO_SEGUIMIENTO = ['Admin', 'Coordinador'];

// Rutas permitidas para el rol Encargado (solo Inicio y Proyectos)
const RUTAS_PERMITIDAS_ENCARGADO = ['/inicio', '/proyectos'];

// Novedades está oculto para todos los perfiles; solo Admin puede acceder por URL con contraseña
const navItemsBase = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  {
    href: '/seguimiento',
    label: 'Meetings',
    icon: ClipboardCheck,
    rolesRequeridos: ROLES_CON_ACCESO_SEGUIMIENTO,
  },
  { href: '/reportes', label: 'Reportes', icon: AtSign },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole ?? null;

  const navItems = navItemsBase
    .filter((item) => {
      const rolesRequeridos =
        'rolesRequeridos' in item ? item.rolesRequeridos : null;
      if (!rolesRequeridos) return true;
      return activeRole && rolesRequeridos.includes(activeRole);
    })
    .filter((item) => {
      // Encargado solo ve Inicio y Proyectos
      if (activeRole === 'Encargado') {
        return RUTAS_PERMITIDAS_ENCARGADO.includes(item.href);
      }
      return true;
    });

  const showConfig = activeRole === 'Admin';

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="flex flex-col">
      {/* Header con el título */}
      <SidebarHeader className="flex items-center justify-center py-6 pl-4 pr-4 group-data-[collapsible=icon]:px-2">
        <h1
          className={`${inter.className} text-3xl font-bold tracking-tight group-data-[collapsible=icon]:hidden`}
        >
          Bemindr
        </h1>
        {/* Título comprimido - solo la "B" */}
        <h1
          className={`${inter.className} text-3xl font-bold tracking-tight hidden group-data-[collapsible=icon]:block`}
        >
          B
        </h1>
      </SidebarHeader>

      {/* Menú de navegación */}
      <SidebarContent className="flex flex-col mt-4 pl-4 pr-4 group-data-[collapsible=icon]:px-2">
        <SidebarMenu className="space-y-3 -ml-[1px] group-data-[collapsible=icon]:ml-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href} className="flex justify-center">
                <SidebarMenuButton
                  asChild
                  tooltip={state === 'collapsed' ? item.label : undefined}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center group-data-[collapsible=icon]:justify-center ${
                      isActive
                        ? 'bg-white text-gray-800 pointer-events-none'
                        : 'text-gray-300 hover:!bg-gray-800 hover:!text-gray-300'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
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

          {/* Ajustes (solo Admin) */}
          {showConfig && (
            <SidebarMenuItem className="flex justify-center">
              <SidebarMenuButton
                asChild
                tooltip={state === 'collapsed' ? 'Ajustes' : undefined}
              >
                <Link
                  href="/configuracion"
                  className={`flex items-center group-data-[collapsible=icon]:justify-center ${
                    pathname.startsWith('/configuracion')
                      ? 'bg-white text-gray-800 pointer-events-none'
                      : 'text-gray-300 hover:!bg-gray-800 hover:!text-gray-300'
                  }`}
                >
                  <Settings
                    className={`h-5 w-5 ${
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

      {/* Footer con información de usuario, botón de colapso y copyright */}
      <SidebarFooter className="flex flex-col items-center justify-center py-4 space-y-1 pl-4 pr-4 group-data-[collapsible=icon]:px-2">
        {/* User info section */}
        <SidebarUserInfo />

        {/* Botón de colapso más intuitivo */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSidebar}
          className="group/collapse h-10 w-10 rounded-full p-0 relative transition-all duration-200 mb-3 bg-sidebar border border-white hover:!bg-white hover:!text-accent-foreground"
        >
          {state === 'collapsed' ? (
            <ChevronsRight className="h-4 w-4 text-white group-hover/collapse:!text-black transition-colors duration-200" />
          ) : (
            <ChevronsLeft className="h-4 w-4 text-white group-hover/collapse:!text-black transition-colors duration-200" />
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
