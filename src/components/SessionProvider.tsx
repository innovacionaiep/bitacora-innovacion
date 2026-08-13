'use client';

import type { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { SESSION_ROLES_REFETCH_INTERVAL_SECONDS } from '@/lib/auth/sync-session-roles';

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  /** RSC-hydrated session avoids status:loading roundtrip on cold start */
  session?: Session | null;
}) {
  return (
    <NextAuthSessionProvider
      session={session ?? undefined}
      // Re-hit /api/auth/session so jwt callback can pull fresh roles from DB
      // after an admin enables/disables roles (without forcing re-login).
      refetchInterval={SESSION_ROLES_REFETCH_INTERVAL_SECONDS}
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
