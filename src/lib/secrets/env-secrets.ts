/**
 * Fail-closed secret helpers (no hardcoded defaults).
 */

export function readRequiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  return value;
}

/** Config panel unlock (usuarios admin). */
export function getConfigUnlockPassword(): string | null {
  return readRequiredEnv('CONFIG_UNLOCK_PASSWORD');
}

/** Novedades / Soporte gate password. */
export function getNovedadesUnlockPassword(): string | null {
  return readRequiredEnv('NOVEDADES_UNLOCK_PASSWORD');
}

export function secretsMatch(
  provided: string,
  expected: string | null
): boolean {
  if (!expected) return false;
  if (typeof provided !== 'string') return false;
  return provided === expected;
}
