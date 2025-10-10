import '@/app/globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConditionalLayout } from '@/components/ConditionalLayout';

// 👉 Inter SOLO para el título, pero ya se usa dentro de SidebarNav
export const metadata = {
  title: 'Gestor de Proyectos',
  description: 'App SaaS con Next.js + Shadcn + Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        {/* Provider de autenticación */}
        <AuthProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
