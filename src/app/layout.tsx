import type { Viewport } from 'next';
import '@/app/globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { ConditionalLayout } from '@/components/ConditionalLayout';
import { DesktopScaleCompensate } from '@/components/DesktopScaleCompensate';

// 👉 Inter SOLO para el título, pero ya se usa dentro de SidebarNav
export const metadata = {
  title: 'Gestor de Proyectos',
  description: 'App SaaS con Next.js + Shadcn + NextAuth + Prisma',
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
          <DesktopScaleCompensate>
            <ConditionalLayout>{children}</ConditionalLayout>
          </DesktopScaleCompensate>
        </SessionProvider>
      </body>
    </html>
  );
}
