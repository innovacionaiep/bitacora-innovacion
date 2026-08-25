import { describe, expect, it } from 'vitest';
import {
  clampPortalView,
  guestTicketStillValid,
  matchPortalGuestCode,
  parsePortalGuestHashes,
  parsePortalGuestTicket,
  portalCanSeeView,
  portalGuestConfiguredFlags,
  portalReadLevelForSessionRoles,
  portalViewsForLevel,
  serializePortalGuestHashes,
} from '@/lib/portal-guest-access';

describe('portal guest hashes', () => {
  it('serializa y parsea los tres niveles', () => {
    const raw = serializePortalGuestHashes({
      1: 'h1',
      2: '',
      3: 'h3',
    });
    expect(parsePortalGuestHashes(raw)).toEqual({
      1: 'h1',
      2: '',
      3: 'h3',
    });
    expect(portalGuestConfiguredFlags(parsePortalGuestHashes(raw))).toEqual({
      1: true,
      2: false,
      3: true,
    });
  });

  it('tolera JSON inválido', () => {
    expect(parsePortalGuestHashes('no-json')).toEqual({
      1: '',
      2: '',
      3: '',
    });
  });
});

describe('portal views by level', () => {
  it('nivel 1 solo proyectos', () => {
    expect(portalViewsForLevel(1)).toEqual(['proyectos']);
    expect(portalCanSeeView(1, 'analisis')).toBe(false);
    expect(portalCanSeeView(1, 'proyectos')).toBe(true);
  });

  it('nivel 2 suma indicadores y avances', () => {
    expect(portalViewsForLevel(2)).toEqual([
      'proyectos',
      'indicadores',
      'avances',
    ]);
    expect(portalCanSeeView(2, 'data')).toBe(false);
  });

  it('nivel 3 ve todo', () => {
    expect(portalViewsForLevel(3)).toEqual([
      'proyectos',
      'analisis',
      'indicadores',
      'avances',
      'data',
    ]);
  });

  it('clampa una vista no permitida a proyectos', () => {
    expect(clampPortalView(1, 'data')).toBe('proyectos');
    expect(clampPortalView(3, 'analisis')).toBe('analisis');
    expect(portalViewsForLevel(0)).toEqual([]);
  });
});

describe('guest ticket', () => {
  it('valida el hash guardado del nivel', () => {
    const ticket = parsePortalGuestTicket({ level: 2, hash: 'abc' });
    expect(ticket).toEqual({ level: 2, hash: 'abc' });
    expect(
      guestTicketStillValid(ticket!, { 1: '', 2: 'abc', 3: '' }),
    ).toBe(true);
    expect(
      guestTicketStillValid(ticket!, { 1: '', 2: 'rotado', 3: '' }),
    ).toBe(false);
  });
});

describe('matchPortalGuestCode', () => {
  it('devuelve el primer nivel cuyo hash coincide', async () => {
    const ticket = await matchPortalGuestCode(
      '  secreto  ',
      { 1: 'h1', 2: 'h2', 3: 'h3' },
      async (plain, hash) => plain === 'secreto' && hash === 'h2',
    );
    expect(ticket).toEqual({ level: 2, hash: 'h2' });
  });

  it('rechaza código vacío o sin match', async () => {
    const compare = async () => false;
    expect(
      await matchPortalGuestCode('', { 1: 'h', 2: '', 3: '' }, compare),
    ).toBeNull();
    expect(
      await matchPortalGuestCode('x', { 1: 'h', 2: '', 3: '' }, compare),
    ).toBeNull();
  });
});

describe('portalReadLevelForSessionRoles', () => {
  it('da nivel 3 a Admin y Coordinador', () => {
    expect(portalReadLevelForSessionRoles(['Admin'])).toBe(3);
    expect(portalReadLevelForSessionRoles(['Coordinador'])).toBe(3);
    expect(portalReadLevelForSessionRoles(['Docente', 'Coordinador'])).toBe(3);
  });

  it('da nivel 1 al resto de cuentas logueadas', () => {
    expect(portalReadLevelForSessionRoles(['Docente'])).toBe(1);
    expect(portalReadLevelForSessionRoles(['Estudiante'])).toBe(1);
    expect(portalReadLevelForSessionRoles(['Encargado'])).toBe(1);
    expect(portalReadLevelForSessionRoles(['Colaborador'])).toBe(1);
    expect(portalReadLevelForSessionRoles(['Beneficiario'])).toBe(1);
    expect(portalReadLevelForSessionRoles([])).toBe(1);
  });
});
