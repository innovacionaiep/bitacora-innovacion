import { describe, expect, it } from 'vitest';
import {
  canGeneratePublicLink,
  generatePublicLinkToken,
  isPublicLinkActive,
  isPublicLinkTokenFormat,
  isPublicProjectPathname,
  publicLinkAbsoluteUrl,
  publicLinkTokenFromPathname,
  publicProjectPath,
  resolveProjectReadAccess,
  resolvePublicLinkOrigin,
  PUBLIC_READER_USER,
} from '@/lib/public-link';

describe('generatePublicLinkToken', () => {
  it('returns 64-char hex from 32 random bytes', () => {
    const buf = Buffer.alloc(32, 0xab);
    const token = generatePublicLinkToken(() => buf);
    expect(token).toBe('ab'.repeat(32));
    expect(isPublicLinkTokenFormat(token)).toBe(true);
  });
});

describe('isPublicLinkActive', () => {
  it('is active when revokedAt is null', () => {
    expect(isPublicLinkActive({ revokedAt: null })).toBe(true);
  });

  it('is inactive when revoked or missing', () => {
    expect(isPublicLinkActive({ revokedAt: new Date('2026-09-11') })).toBe(
      false
    );
    expect(isPublicLinkActive(null)).toBe(false);
  });
});

describe('public URLs', () => {
  it('builds path and absolute url', () => {
    const token = 'ab'.repeat(32);
    expect(publicProjectPath(token)).toBe(`/p/${token}`);
    expect(
      publicLinkAbsoluteUrl('https://bitacora-innovacion.vercel.app/', token)
    ).toBe(`https://bitacora-innovacion.vercel.app/p/${token}`);
  });

  it('skips localhost when resolving share origin', () => {
    expect(resolvePublicLinkOrigin('http://localhost:3000')).toBe(
      'https://bitacora-innovacion.vercel.app'
    );
    expect(
      resolvePublicLinkOrigin(
        'http://127.0.0.1:3000',
        'https://bitacora-innovacion.vercel.app/'
      )
    ).toBe('https://bitacora-innovacion.vercel.app');
  });

  it('detects public pathnames and extracts token', () => {
    const token = 'cd'.repeat(32);
    expect(isPublicProjectPathname('/p')).toBe(true);
    expect(isPublicProjectPathname(`/p/${token}`)).toBe(true);
    expect(isPublicProjectPathname('/proyectos')).toBe(false);
    expect(publicLinkTokenFromPathname(`/p/${token}`)).toBe(token);
    expect(publicLinkTokenFromPathname('/p/nope')).toBeNull();
  });
});

describe('canGeneratePublicLink', () => {
  it('allows generate only when no active link', () => {
    expect(canGeneratePublicLink(false)).toBe(true);
    expect(canGeneratePublicLink(true)).toBe(false);
  });
});

describe('resolveProjectReadAccess', () => {
  const fail = { ok: false as const, error: 'No autenticado' };
  const sessionOk = { ok: true as const, user: { id: 'u1' } };

  it('prefers a valid session', () => {
    const gate = resolveProjectReadAccess({
      proyectoId: 'p1',
      sessionGate: sessionOk,
      publicToken: 'tok',
      tokenProyectoId: 'p1',
    });
    expect(gate).toEqual(sessionOk);
  });

  it('allows matching active public token when session fails', () => {
    const gate = resolveProjectReadAccess({
      proyectoId: 'p1',
      sessionGate: fail,
      publicToken: 'tok',
      tokenProyectoId: 'p1',
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.user.id).toBe(PUBLIC_READER_USER.id);
  });

  it('rejects public token for another project', () => {
    const gate = resolveProjectReadAccess({
      proyectoId: 'p1',
      sessionGate: fail,
      publicToken: 'tok',
      tokenProyectoId: 'p2',
    });
    expect(gate).toEqual(fail);
  });
});
