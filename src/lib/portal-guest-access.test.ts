import { describe, expect, it } from 'vitest';
import {
  clampPortalView,
  guestTicketStillValid,
  matchPortalGuestCode,
  parsePortalGuestHashes,
  parsePortalGuestTicket,
  portalCanSeeView,
  portalLevelCaption,
  portalNeedsVitrinaProyectos,
  portalGuestConfiguredFlags,
  portalReadLevelForSessionRoles,
  portalSessionLevelCaption,
  portalSessionRedirectsToApp,
  portalViewsForLevel,
  serializePortalGuestHashes,
  DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
  parsePortalSessionRoleLevels,
  serializePortalSessionRoleLevels,
} from '@/lib/portal-guest-access';

describe('portal guest hashes', () => {
  it('serializa y parsea los cuatro niveles, incluido Causalab', () => {
    const raw = serializePortalGuestHashes({
      0: 'h0',
      1: 'h1',
      2: '',
      3: 'h3',
    });
    expect(parsePortalGuestHashes(raw)).toEqual({
      0: 'h0',
      1: 'h1',
      2: '',
      3: 'h3',
    });
    expect(portalGuestConfiguredFlags(parsePortalGuestHashes(raw))).toEqual({
      0: true,
      1: true,
      2: false,
      3: true,
    });
  });

  it('completa el nivel 0 al leer JSON antiguo sin Causalab', () => {
    expect(parsePortalGuestHashes('{"1":"h1","2":"","3":"h3"}')).toEqual({
      0: '',
      1: 'h1',
      2: '',
      3: 'h3',
    });
  });

  it('tolera JSON inválido', () => {
    expect(parsePortalGuestHashes('no-json')).toEqual({
      0: '',
      1: '',
      2: '',
      3: '',
    });
  });
});

describe('portal views by level', () => {
  it('nivel 0 Causalab ve Avances e Indicadores, solo Impulsa', () => {
    expect(portalViewsForLevel(0)).toEqual(['avances', 'indicadores']);
    expect(portalCanSeeView(0, 'avances')).toBe(true);
    expect(portalCanSeeView(0, 'indicadores')).toBe(true);
    expect(portalCanSeeView(0, 'proyectos')).toBe(false);
    expect(clampPortalView(0, 'proyectos')).toBe('avances');
    expect(clampPortalView(0, 'indicadores')).toBe('indicadores');
    expect(portalNeedsVitrinaProyectos(0)).toBe(true);
    expect(portalNeedsVitrinaProyectos(1)).toBe(true);
    expect(portalLevelCaption(0)).toBe(
      'Avances, Indicadores (solo Fondo Impulsa)',
    );
  });

  it('sin acceso no ve ninguna vista', () => {
    expect(portalViewsForLevel(null)).toEqual([]);
    expect(portalCanSeeView(null, 'avances')).toBe(false);
  });

  it('nivel 1 solo proyectos', () => {
    expect(portalViewsForLevel(1)).toEqual(['proyectos']);
    expect(portalCanSeeView(1, 'analisis')).toBe(false);
    expect(portalCanSeeView(1, 'proyectos')).toBe(true);
  });

  it('nivel 2 suma avances e indicadores', () => {
    expect(portalViewsForLevel(2)).toEqual([
      'proyectos',
      'avances',
      'indicadores',
    ]);
    expect(portalCanSeeView(2, 'data')).toBe(false);
  });

  it('nivel 3 ve todo, con Avances entre Proyectos y Análisis', () => {
    expect(portalViewsForLevel(3)).toEqual([
      'proyectos',
      'avances',
      'analisis',
      'indicadores',
      'data',
    ]);
  });

  it('clampa una vista no permitida a la primera permitida', () => {
    expect(clampPortalView(1, 'data')).toBe('proyectos');
    expect(clampPortalView(3, 'analisis')).toBe('analisis');
    expect(clampPortalView(0, 'proyectos')).toBe('avances');
  });
});

describe('guest ticket', () => {
  it('valida el hash guardado del nivel', () => {
    const ticket = parsePortalGuestTicket({ level: 2, hash: 'abc' });
    expect(ticket).toEqual({ level: 2, hash: 'abc' });
    expect(
      guestTicketStillValid(ticket!, { 0: '', 1: '', 2: 'abc', 3: '' }),
    ).toBe(true);
    expect(
      guestTicketStillValid(ticket!, { 0: '', 1: '', 2: 'rotado', 3: '' }),
    ).toBe(false);
  });

  it('acepta el ticket de nivel 0 Causalab', () => {
    const ticket = parsePortalGuestTicket({ level: 0, hash: 'c0' });
    expect(ticket).toEqual({ level: 0, hash: 'c0' });
    expect(
      guestTicketStillValid(ticket!, { 0: 'c0', 1: '', 2: '', 3: '' }),
    ).toBe(true);
  });
});

describe('matchPortalGuestCode', () => {
  it('devuelve el primer nivel cuyo hash coincide', async () => {
    const ticket = await matchPortalGuestCode(
      '  secreto  ',
      { 0: 'h0', 1: 'h1', 2: 'h2', 3: 'h3' },
      async (plain, hash) => plain === 'secreto' && hash === 'h2',
    );
    expect(ticket).toEqual({ level: 2, hash: 'h2' });
  });

  it('matchea el código de Causalab', async () => {
    const ticket = await matchPortalGuestCode(
      'causalab',
      { 0: 'h0', 1: '', 2: '', 3: '' },
      async (plain, hash) => plain === 'causalab' && hash === 'h0',
    );
    expect(ticket).toEqual({ level: 0, hash: 'h0' });
  });

  it('rechaza código vacío o sin match', async () => {
    const compare = async () => false;
    expect(
      await matchPortalGuestCode('', { 0: '', 1: 'h', 2: '', 3: '' }, compare),
    ).toBeNull();
    expect(
      await matchPortalGuestCode('x', { 0: '', 1: 'h', 2: '', 3: '' }, compare),
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

  it('usa el mayor nivel entre los roles de la cuenta', () => {
    const custom: typeof DEFAULT_PORTAL_SESSION_ROLE_LEVELS = {
      ...DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
      Docente: 2,
      Coordinador: 1,
    };
    expect(portalReadLevelForSessionRoles(['Docente'], custom)).toBe(2);
    expect(portalReadLevelForSessionRoles(['Coordinador'], custom)).toBe(1);
    expect(
      portalReadLevelForSessionRoles(['Coordinador', 'Docente'], custom),
    ).toBe(2);
  });

  it('permite nivel 0 de sesión: redirigir a la app', () => {
    const custom: typeof DEFAULT_PORTAL_SESSION_ROLE_LEVELS = {
      ...DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
      Docente: 0,
    };
    expect(portalReadLevelForSessionRoles(['Docente'], custom)).toBe(0);
    expect(portalSessionRedirectsToApp('session', 0)).toBe(true);
    expect(portalSessionRedirectsToApp('guest', 0)).toBe(false);
    expect(portalSessionRedirectsToApp('session', 1)).toBe(false);
    expect(portalSessionLevelCaption(0)).toBe('Redirige a Inicio en la app');
    expect(portalSessionLevelCaption(1)).toBe('Proyectos');
  });
});

describe('portal session role levels', () => {
  it('serializa y completa defaults al parsear JSON parcial', () => {
    const raw = serializePortalSessionRoleLevels({
      ...DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
      Docente: 0,
    });
    expect(parsePortalSessionRoleLevels(raw).Docente).toBe(0);
    expect(parsePortalSessionRoleLevels(raw).Admin).toBe(3);
    expect(parsePortalSessionRoleLevels('{"Docente":2}').Docente).toBe(2);
    expect(parsePortalSessionRoleLevels('{"Docente":2}').Admin).toBe(3);
    expect(parsePortalSessionRoleLevels('no-json')).toEqual(
      DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
    );
  });
});
