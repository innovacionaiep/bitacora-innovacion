import type { Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { RouteAwareShell } from '@/components/RouteAwareShell';
import { getSession } from '@/lib/auth-utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Bitácora - Gestión de Proyectos',
  description:
    'Plataforma para seguimiento fácil de actividades, presupuesto y más.',
  openGraph: {
    title: 'Bitácora - Gestión de Proyectos',
    description:
      'Plataforma para seguimiento fácil de actividades, presupuesto y más.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html
      lang="es"
      className={`h-full overflow-hidden ${inter.variable}`}
    >
      <body className="bg-background text-foreground h-full min-h-0 overflow-hidden font-sans">
        <SessionProvider session={session}>
          <RouteAwareShell>{children}</RouteAwareShell>
        </SessionProvider>
      </body>
    </html>
  );
}
