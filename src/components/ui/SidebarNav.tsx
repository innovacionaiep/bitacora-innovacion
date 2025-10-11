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
  LayoutDashboard,
  FolderKanban,
  GanttChart,
  BarChart3,
  Wallet,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Newspaper,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import { Button } from '@/components/ui/button';

const inter = Inter({ subsets: ['latin'], weight: ['700'] }); // Bold para el título

const navItems = [
  { href: '/novedades', label: 'Novedades', icon: Newspaper },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/gantt', label: 'Gantt', icon: GanttChart },
  { href: '/indicadores', label: 'Indicadores', icon: BarChart3 },
  { href: '/presupuesto', label: 'Presupuesto', icon: Wallet },
  { href: '/seguimiento', label: 'Seguimiento', icon: ClipboardCheck },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="flex flex-col">
      {/* Header con el título */}
      <SidebarHeader className="flex items-center justify-center py-6 pl-4 pr-4 group-data-[collapsible=icon]:px-2">
        <h1
          className={`${inter.className} text-3xl font-bold tracking-tight group-data-[collapsible=icon]:hidden`}
        >
          BITACORA
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
        <SidebarMenu className="space-y-3">
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
                        ? 'bg-black text-white pointer-events-none'
                        : 'text-gray-700 hover:!bg-gray-200 hover:text-black'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-700 hover:text-black'
                      }`}
                    />
                    <span className="ml-3 group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer con botón de colapso y copyright */}
      <SidebarFooter className="flex flex-col items-center justify-center py-4 space-y-4 pl-4 pr-4 group-data-[collapsible=icon]:px-2">
        {/* Botón de colapso más intuitivo */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSidebar}
          className="w-full max-w-[200px] group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:px-0 transition-all duration-200 group-data-[collapsible=icon]:mx-0"
        >
          <div className="flex items-center justify-center gap-2 group-data-[collapsible=icon]:gap-0">
            {state === 'collapsed' ? (
              <>
                <Menu className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Expandir
                </span>
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Comprimir
                </span>
              </>
            )}
          </div>
        </Button>

        <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          © 2025 Paul Guitard
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
