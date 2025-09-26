"use client"

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  FolderKanban,
  GanttChart,
  BarChart3,
  Wallet,
  ClipboardCheck,
} from "lucide-react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], weight: ["700"] }) // Bold para el título

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/gantt", label: "Gantt", icon: GanttChart },
  { href: "/indicadores", label: "Indicadores", icon: BarChart3 },
  { href: "/presupuesto", label: "Presupuesto", icon: Wallet },
  { href: "/seguimiento", label: "Seguimiento", icon: ClipboardCheck },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <Sidebar className="w-56 flex flex-col">
      {/* Header con el título */}
      <SidebarHeader className="flex items-center justify-center py-6">
        <h1 className={`${inter.className} text-3xl font-bold tracking-tight`}>
          BITACORA
        </h1>
      </SidebarHeader>

      {/* Menú de navegación */}
      <SidebarContent className="flex flex-col mt-4">
        <SidebarMenu className="space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <SidebarMenuItem key={item.href} className="flex justify-center">
                <SidebarMenuButton asChild>
                  <Link
  href={item.href}
  className={`flex items-center pl-6 pr-3 py-2 rounded-md transition-colors max-w-[180px] w-full ${
    isActive
      ? "bg-black text-white pointer-events-none"
      : "text-gray-700 hover:!bg-gray-200 hover:text-black"
  }`}
                  >
                    <Icon
                      className={`h-5 w-5 mr-3 ${
                        isActive
                          ? "text-white"
                          : "text-gray-700 hover:text-black"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="flex items-center justify-center py-4">
        <p className="text-xs text-muted-foreground">© 2025 Paul Guitard</p>
      </SidebarFooter>
    </Sidebar>
  )
}
