import { afterEach, describe, expect, it } from 'vitest';
import {
  getConfigUnlockPassword,
  getNovedadesUnlockPassword,
  readRequiredEnv,
  secretsMatch,
} from '@/lib/secrets/env-secrets';

const KEYS = ['CONFIG_UNLOCK_PASSWORD', 'NOVEDADES_UNLOCK_PASSWORD', 'TEST_SECRET_X'] as const;

afterEach(() => {
  for (const k of KEYS) {
    delete process.env[k];
  }
});

describe('readRequiredEnv / fail-closed secrets', () => {
  it('returns null when config env is missing (no default)', () => {
    delete process.env.CONFIG_UNLOCK_PASSWORD;
    expect(getConfigUnlockPassword()).toBeNull();
  });

  it('returns hardcoded novedades/soporte gate password', () => {
    delete process.env.NOVEDADES_UNLOCK_PASSWORD;
    expect(getNovedadesUnlockPassword()).toBe('bitacora');
  });

  it('returns trimmed value when set', () => {
    process.env.CONFIG_UNLOCK_PASSWORD = '  strong-secret  ';
    expect(getConfigUnlockPassword()).toBe('strong-secret');
  });

  it('rejects match when expected secret is missing', () => {
    expect(secretsMatch('bitacora', null)).toBe(false);
    expect(secretsMatch('bitacora', getConfigUnlockPassword())).toBe(false);
  });

  it('accepts bitacora for novedades/soporte regardless of env', () => {
    process.env.NOVEDADES_UNLOCK_PASSWORD = 'novedades-secret';
    expect(secretsMatch('bitacora', getNovedadesUnlockPassword())).toBe(true);
    expect(secretsMatch('novedades-secret', getNovedadesUnlockPassword())).toBe(
      false
    );
  });

  it('treats whitespace-only as missing', () => {
    process.env.TEST_SECRET_X = '   ';
    expect(readRequiredEnv('TEST_SECRET_X')).toBeNull();
  });
});
