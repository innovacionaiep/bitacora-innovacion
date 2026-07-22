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
import { Inter } from 'next/font/google';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import type { PermissionKey } from '@/lib/permissions/catalog';

const inter = Inter({ subsets: ['latin'], weight: ['700'] });

const LOGO_EXPANDED_W = 112;
const LOGO_COLLAPSED_PX = 40;

const navItemsBase: {
  href: string;
  label: string;
  icon: typeof Home;
  viewKey: PermissionKey;
}[] = [
  { href: '/inicio', label: 'Inicio', icon: Home, viewKey: 'view.inicio' },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    viewKey: 'view.dashboard',
  },
  {
    href: '/proyectos',
    label: 'Proyectos',
    icon: FolderKanban,
    viewKey: 'view.proyectos',
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: AtSign,
    viewKey: 'view.reportes',
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { can } = useActiveRolePermissions();
  const isCollapsed = state === 'collapsed';

  const navItems = navItemsBase.filter((item) => can(item.viewKey));
  const showConfig = can('view.ajustes');

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="flex flex-col overflow-x-hidden">
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
