/**
 * Keep JWT/session role claims in sync with the database.
 * Admin can enable/disable roles while the user stays logged in; without a
 * refresh, NextAuth JWT (30d) would keep stale availableRoles until re-login.
 */

/** Client SessionProvider poll. Aligned with JWT throttle so each poll refreshes once. */
export const SESSION_ROLES_REFETCH_INTERVAL_SECONDS = 300;

/** Throttle DB role lookups inside the jwt callback (ms). Match the client poll. */
export const JWT_ROLES_REFRESH_INTERVAL_MS = 300_000;

export type RoleClaims = {
  availableRoles: string[];
  activeRole: string | null;
};

export function shouldRefreshJwtRoles(
  lastRefreshedAt: number | undefined,
  now: number,
  intervalMs: number = JWT_ROLES_REFRESH_INTERVAL_MS
): boolean {
  if (lastRefreshedAt == null) return true;
  return now - lastRefreshedAt >= intervalMs;
}

export function buildRoleClaims(
  roles: readonly string[],
  activeRole: string | null | undefined
): RoleClaims {
  const availableRoles = Array.from(new Set(roles));
  const activeStillValid =
    activeRole != null && availableRoles.includes(activeRole);
  return {
    availableRoles,
    activeRole: activeStillValid ? activeRole : (availableRoles[0] ?? null),
  };
}
