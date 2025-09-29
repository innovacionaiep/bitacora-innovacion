import "@/app/globals.css"
import {
  SidebarProvider,
} from "@/components/ui/sidebar"

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu"

import SidebarNav from "@/components/ui/SidebarNav" // 👈 ruta correcta
import PageHeader from "@/components/PageHeader"
import ResponsiveMain from "@/components/ResponsiveMain"

// 👉 Inter SOLO para el título, pero ya se usa dentro de SidebarNav
export const metadata = {
  title: "Gestor de Proyectos",
  description: "App SaaS con Next.js + Shadcn + Supabase",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="flex h-screen bg-background text-foreground">
        {/* Provider del sidebar */}
        <SidebarProvider defaultOpen={true}>
          {/* 👇 Sidebar separado en su componente cliente */}
          <SidebarNav />

          {/* Contenedor derecho que se adapta al estado del sidebar */}
          <ResponsiveMain>
            {/* Header con menú */}
            <PageHeader />

            {/* Contenido principal */}
            <div className="flex-1 overflow-y-auto p-6 pt-8">
              <div className="w-full">{children}</div>
            </div>
          </ResponsiveMain>
        </SidebarProvider>
      </body>
    </html>
  )
}
