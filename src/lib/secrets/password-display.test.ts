import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptPasswordForDisplay,
  encryptPasswordForDisplay,
} from '@/lib/secrets/password-display';

const KEYS = ['PASSWORD_DISPLAY_SECRET', 'CONFIG_UNLOCK_PASSWORD'] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe('encryptPasswordForDisplay / decryptPasswordForDisplay', () => {
  it('roundtrip con PASSWORD_DISPLAY_SECRET', () => {
    process.env.PASSWORD_DISPLAY_SECRET = 'display-secret';
    const enc = encryptPasswordForDisplay('clave-usuario');
    expect(enc).toBeTruthy();
    expect(enc).not.toContain('clave-usuario');
    expect(decryptPasswordForDisplay(enc!)).toBe('clave-usuario');
  });

  it('roundtrip con CONFIG_UNLOCK_PASSWORD si no hay display secret', () => {
    process.env.CONFIG_UNLOCK_PASSWORD = 'unlock-secret';
    const enc = encryptPasswordForDisplay('otra-clave');
    expect(decryptPasswordForDisplay(enc!)).toBe('otra-clave');
  });

  it('descifra copias hechas con el default legado bitacora', () => {
    process.env.CONFIG_UNLOCK_PASSWORD = 'bitacora';
    const enc = encryptPasswordForDisplay('legacy-pass');
    delete process.env.CONFIG_UNLOCK_PASSWORD;
    process.env.CONFIG_UNLOCK_PASSWORD = 'nuevo-unlock';
    expect(decryptPasswordForDisplay(enc!)).toBe('legacy-pass');
  });

  it('no cifra si no hay secreto', () => {
    expect(encryptPasswordForDisplay('x')).toBeNull();
  });
});
