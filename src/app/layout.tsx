import type { Viewport } from 'next';
import '@/app/globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';

// 👉 Inter SOLO para el título, pero ya se usa dentro de SidebarNav
export const metadata = {
  title: 'Bemindr - Gestión de Proyectos',
  description: 'Plataforma para seguimiento fácil de actividades, presupuesto y más.',
  openGraph: {
    title: 'Bemindr - Gestión de Proyectos',
    description: 'Plataforma para seguimiento fácil de actividades, presupuesto y más.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full overflow-hidden">
      <body className="bg-background text-foreground h-full min-h-0 overflow-hidden">
        <SessionProvider>
          <QueryProvider>
            <DesktopScaleCompensate>
              <ConditionalLayout>{children}</ConditionalLayout>
            </DesktopScaleCompensate>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
