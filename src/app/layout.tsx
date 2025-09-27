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
        <SidebarProvider>
          {/* 👇 Sidebar separado en su componente cliente */}
          <SidebarNav />

          {/* Contenedor derecho desplazado por el ancho del sidebar */}
          <div className="flex flex-col flex-1 ml-56">
            {/* Header con menú */}
            <PageHeader />

            {/* Contenido principal */}
            <main className="flex-1 overflow-y-auto p-6 pt-8">
              <div className="w-full">{children}</div>
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}
