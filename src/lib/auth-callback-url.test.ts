import { describe, expect, it } from 'vitest';
import { sanitizeAuthCallbackUrl } from '@/lib/auth-callback-url';

describe('sanitizeAuthCallbackUrl', () => {
  it('usa el portal si falta o está vacío', () => {
    expect(sanitizeAuthCallbackUrl(null)).toBe('/');
    expect(sanitizeAuthCallbackUrl(undefined)).toBe('/');
    expect(sanitizeAuthCallbackUrl('  ')).toBe('/');
  });

  it('acepta el hero y la vista de proyectos', () => {
    expect(sanitizeAuthCallbackUrl('/')).toBe('/');
    expect(sanitizeAuthCallbackUrl('/?vista=proyectos')).toBe(
      '/?vista=proyectos',
    );
    expect(
      sanitizeAuthCallbackUrl(encodeURIComponent('/?vista=proyectos')),
    ).toBe('/?vista=proyectos');
  });

  it('acepta rutas internas de la app', () => {
    expect(sanitizeAuthCallbackUrl('/inicio')).toBe('/inicio');
    expect(sanitizeAuthCallbackUrl('/dashboard')).toBe('/dashboard');
  });

  it('rechaza URLs externas, protocol-relative y auth/api', () => {
    expect(sanitizeAuthCallbackUrl('https://evil.example/phish')).toBe('/');
    expect(sanitizeAuthCallbackUrl('//evil.example/x')).toBe('/');
    expect(sanitizeAuthCallbackUrl('/\\evil')).toBe('/');
    expect(sanitizeAuthCallbackUrl('/auth/login')).toBe('/');
    expect(sanitizeAuthCallbackUrl('/api/auth/session')).toBe('/');
  });
});
