/**
 * Secret helpers. Config unlock is fail-closed (env only).
 * Novedades/Soporte uses a hardcoded gate password.
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

/** Token de API Externa v1 de MideImpacto (solo servidor). */
export function getMideimpactoApiKey(): string | null {
  // Acceso estático: Next/Turbopack no inyecta process.env[name] dinámico.
  const value = process.env.MIDEIMPACTO_API_KEY?.trim();
  if (!value) return null;
  return value;
}

/** Contraseña de Novedades / Soporte (fija; no depende de env). */
export const NOVEDADES_GATE_PASSWORD = 'bitacora';

export function getNovedadesUnlockPassword(): string {
  return NOVEDADES_GATE_PASSWORD;
}

export function secretsMatch(
  provided: string,
  expected: string | null
): boolean {
  if (!expected) return false;
  if (typeof provided !== 'string') return false;
  return provided === expected;
}
