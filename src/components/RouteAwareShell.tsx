'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const AuthenticatedShell = dynamic(
  () =>
    import('@/components/AuthenticatedShell').then(
      (m) => m.AuthenticatedShell
    ),
  { ssr: true }
);

const AUTH_PREFIXES = ['/auth/login', '/auth/register', '/auth/forgot-password'];

/**
 * On auth/mantenimiento routes, skip QueryProvider + ConditionalLayout + Chat
 * so the login cold start does not download the authenticated shell chunk.
 */
export function RouteAwareShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLightRoute =
    AUTH_PREFIXES.some((r) => pathname.startsWith(r)) ||
    pathname === '/mantenimiento';

  if (isLightRoute) {
    return <>{children}</>;
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
