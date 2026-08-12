import type { Metadata, Viewport } from 'next';
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

const siteTitle = 'Bitácora - Dir. Nac. Emprendimiento e I+D';
const siteDescription =
  'App para seguimiento de proyectos: Innovación Docente, Reto Innovador, Fondo Impulsa.';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXTAUTH_URL ?? 'https://bitacora-innovacion.vercel.app',
  ),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: 'website',
    locale: 'es_CL',
    siteName: 'Bitácora',
  },
  twitter: {
    card: 'summary',
    title: siteTitle,
    description: siteDescription,
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
  let session = null;
  try {
    session = await getSession();
  } catch (error) {
    console.error('[RootLayout] getSession failed:', error);
  }

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
