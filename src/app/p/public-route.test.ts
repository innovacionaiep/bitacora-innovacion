import { describe, expect, it } from 'vitest';
import { isPublicLinkTokenFormat, isPublicProjectPathname } from '@/lib/public-link';

describe('ruta pública /p', () => {
  it('reconoce /p/{token} como pública', () => {
    const token = 'ab'.repeat(32);
    expect(isPublicLinkTokenFormat(token)).toBe(true);
    expect(isPublicProjectPathname(`/p/${token}`)).toBe(true);
    expect(isPublicProjectPathname('/proyectos')).toBe(false);
  });
});
