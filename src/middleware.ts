import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import {
  MAINTENANCE_PATH,
  MAINTENANCE_SETTINGS_PATH,
  MAINTENANCE_STATUS_API,
  isProductionRuntime,
} from '@/lib/maintenance';

const authMiddleware = withAuth({
  pages: {
    signIn: '/auth/login',
  },
});

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)
  );
}

/** Imágenes de preview (WhatsApp/OG) deben ser públicas: el crawler no tiene sesión. */
function isPublicSeoAsset(pathname: string) {
  return (
    pathname === '/icon' ||
    pathname.startsWith('/icon/') ||
    pathname === '/apple-icon' ||
    pathname.startsWith('/apple-icon/') ||
    pathname === '/opengraph-image' ||
    pathname.startsWith('/opengraph-image/') ||
    pathname === '/twitter-image' ||
    pathname.startsWith('/twitter-image/')
  );
}

function maintenanceOrigin(req: NextRequest) {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return req.nextUrl.origin;
}

async function fetchMaintenanceEnabled(req: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${maintenanceOrigin(req)}${MAINTENANCE_STATUS_API}`, {
      headers: { 'x-maintenance-check': '1' },
      // Evita martillar la BD en cada request; el apagado puede tardar ~5s
      next: { revalidate: 5 },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Salida temprana: no reentrar al chequear estado (evita bucle middleware → API → middleware)
  if (
    pathname === MAINTENANCE_STATUS_API ||
    isStaticAsset(pathname) ||
    isPublicSeoAsset(pathname)
  ) {
    return NextResponse.next();
  }

  // Auth routes: never wait on maintenance fetch (cold start / login path)
  if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // En local / preview nunca bloqueamos por mantenimiento
  if (isProductionRuntime()) {
    const enabled = await fetchMaintenanceEnabled(req);

    if (enabled) {
      if (
        pathname === MAINTENANCE_PATH ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/auth')
      ) {
        return NextResponse.next();
      }

      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      const roles = (token?.availableRoles as string[] | undefined) ?? [];
      const isAdmin = roles.includes('Admin');

      // Admin puede entrar al tab para desactivar el modo
      if (isAdmin && pathname.startsWith(MAINTENANCE_SETTINGS_PATH)) {
        return NextResponse.next();
      }

      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Servicio en mantenimiento' },
          { status: 503, headers: { 'Retry-After': '3600' } },
        );
      }

      const url = req.nextUrl.clone();
      url.pathname = MAINTENANCE_PATH;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return (
    authMiddleware as unknown as (
      req: NextRequest,
      event: NextFetchEvent,
    ) => ReturnType<typeof NextResponse.next>
  )(req, event);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
