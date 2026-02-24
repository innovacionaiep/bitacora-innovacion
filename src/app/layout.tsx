import type { Viewport } from 'next';
import '@/app/globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { ConditionalLayout } from '@/components/ConditionalLayout';

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
    <html lang="es">
      <body className="bg-background text-foreground min-h-screen">
        <SessionProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
