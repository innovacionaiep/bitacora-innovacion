import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { MAINTENANCE_MODE_ENABLED, MAINTENANCE_PATH } from '@/lib/maintenance';

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

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (MAINTENANCE_MODE_ENABLED) {
    // Permitir NextAuth (SessionProvider) + assets + la propia página
    if (
      pathname === MAINTENANCE_PATH ||
      pathname.startsWith('/api/auth') ||
      isStaticAsset(pathname)
    ) {
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

  // Fuera de mantenimiento: no exigir sesión en auth / NextAuth
  if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
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
