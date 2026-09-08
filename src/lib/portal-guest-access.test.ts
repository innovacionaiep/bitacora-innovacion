import { describe, expect, it } from 'vitest';
import {
  clampPortalView,
  guestTicketStillValid,
  matchPortalGuestCode,
  parsePortalGuestHashes,
  parsePortalGuestTicket,
  portalCanEnterApp,
  portalCanSeeView,
  portalCanUseAiChat,
  portalGuestConfiguredFlags,
  portalIsCausalab,
  portalLevelCaption,
  portalNeedsVitrinaProyectos,
  portalProfileCaption,
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
  it('serializa y parsea niveles generales y perfiles específicos', () => {
    const raw = serializePortalGuestHashes({
      0: 'h0',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: 'hc',
      vinculacion: 'hv',
    });
    expect(parsePortalGuestHashes(raw)).toEqual({
      0: 'h0',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: 'hc',
      vinculacion: 'hv',
    });
    expect(portalGuestConfiguredFlags(parsePortalGuestHashes(raw))).toEqual({
      0: true,
      1: true,
      2: false,
      3: true,
      causalab: true,
      vinculacion: true,
    });
  });

  it('migra JSON antiguo: el nivel 0 era Causalab', () => {
    expect(parsePortalGuestHashes('{"1":"h1","2":"","3":"h3"}')).toEqual({
      0: '',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: '',
      vinculacion: '',
    });
    expect(parsePortalGuestHashes('{"0":"old0","1":"h1","2":"","3":"h3"}')).toEqual({
      0: '',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: 'old0',
      vinculacion: '',
    });
  });

  it('no remigra si el JSON ya trae perfiles', () => {
    expect(
      parsePortalGuestHashes(
        '{"0":"g0","1":"","2":"","3":"","causalab":"c0","vinculacion":""}',
      ),
    ).toEqual({
      0: 'g0',
      1: '',
      2: '',
      3: '',
      causalab: 'c0',
      vinculacion: '',
    });
  });

  it('tolera JSON inválido', () => {
    expect(parsePortalGuestHashes('no-json')).toEqual({
      0: '',
      1: '',
      2: '',
      3: '',
      causalab: '',
      vinculacion: '',
    });
  });
});

describe('portal views by level', () => {
  it('nivel 0 general ve Avances e Indicadores, sin recorte Impulsa', () => {
    expect(portalViewsForLevel(0)).toEqual(['avances', 'indicadores']);
    expect(portalCanSeeView(0, 'avances')).toBe(true);
    expect(portalCanSeeView(0, 'indicadores')).toBe(true);
    expect(portalCanSeeView(0, 'proyectos')).toBe(false);
    expect(clampPortalView(0, 'proyectos')).toBe('avances');
    expect(clampPortalView(0, 'indicadores')).toBe('indicadores');
    expect(portalNeedsVitrinaProyectos(0)).toBe(true);
    expect(portalNeedsVitrinaProyectos(1)).toBe(true);
    expect(portalLevelCaption(0)).toBe('Avances, Indicadores');
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
      'vinculamos',
    ]);
    expect(portalCanSeeView(3, 'vinculamos')).toBe(true);
    expect(portalCanSeeView(2, 'vinculamos')).toBe(false);
  });

  it('clampa una vista no permitida a la primera permitida', () => {
    expect(clampPortalView(1, 'data')).toBe('proyectos');
    expect(clampPortalView(3, 'analisis')).toBe('analisis');
    expect(clampPortalView(0, 'proyectos')).toBe('avances');
  });
});

describe('perfiles de invitado', () => {
  it('Causalab replica vistas de nivel 0 y recorta a Impulsa', () => {
    expect(portalViewsForLevel(0)).toEqual(['avances', 'indicadores']);
    expect(portalProfileCaption('causalab')).toBe(
      'Avances, Indicadores (solo Fondo Impulsa)',
    );
    expect(
      portalIsCausalab({ kind: 'guest', level: 0, profile: 'causalab' }),
    ).toBe(true);
    expect(portalIsCausalab({ kind: 'guest', level: 0, profile: null })).toBe(
      false,
    );
    expect(
      portalIsCausalab({ kind: 'session', level: 0, profile: null }),
    ).toBe(false);
  });

  it('Vinculación replica vistas de nivel 3, sin chat ni ingreso a la app', () => {
    expect(portalProfileCaption('vinculacion')).toBe(
      'Toda la información de lectura, sin chat IA ni ingreso a la app',
    );
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 3, profile: 'vinculacion' }),
    ).toBe(false);
    expect(
      portalCanEnterApp({ kind: 'guest', level: 3, profile: 'vinculacion' }),
    ).toBe(false);
    expect(portalCanSeeView(3, 'vinculamos')).toBe(true);
    expect(portalCanSeeView(3, 'proyectos')).toBe(true);
  });

  it('el chat IA sigue el nivel general y se apaga en perfiles específicos', () => {
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 0, profile: null }),
    ).toBe(false);
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 1, profile: null }),
    ).toBe(true);
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 3, profile: null }),
    ).toBe(true);
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 0, profile: 'causalab' }),
    ).toBe(false);
    expect(
      portalCanUseAiChat({ kind: 'session', level: 3, profile: null }),
    ).toBe(true);
    expect(
      portalCanUseAiChat({ kind: 'session', level: 0, profile: null }),
    ).toBe(false);
    expect(portalCanUseAiChat({ kind: 'none', level: null, profile: null })).toBe(
      false,
    );
  });

  it('invitados generales y Causalab pueden ver el CTA de la app', () => {
    expect(
      portalCanEnterApp({ kind: 'guest', level: 1, profile: null }),
    ).toBe(true);
    expect(
      portalCanEnterApp({ kind: 'guest', level: 0, profile: 'causalab' }),
    ).toBe(true);
    expect(
      portalCanEnterApp({ kind: 'none', level: null, profile: null }),
    ).toBe(true);
    expect(
      portalCanEnterApp({ kind: 'session', level: 3, profile: null }),
    ).toBe(true);
  });
});

describe('guest ticket', () => {
  it('valida el hash guardado del nivel general', () => {
    const ticket = parsePortalGuestTicket({ level: 2, hash: 'abc' });
    expect(ticket).toEqual({ level: 2, hash: 'abc', profile: null });
    expect(
      guestTicketStillValid(ticket!, {
        0: '',
        1: '',
        2: 'abc',
        3: '',
        causalab: '',
        vinculacion: '',
      }),
    ).toBe(true);
    expect(
      guestTicketStillValid(ticket!, {
        0: '',
        1: '',
        2: 'rotado',
        3: '',
        causalab: '',
        vinculacion: '',
      }),
    ).toBe(false);
  });

  it('acepta ticket de perfil Causalab y el legado nivel 0', () => {
    const hashed = {
      0: '',
      1: '',
      2: '',
      3: '',
      causalab: 'c0',
      vinculacion: '',
    };
    const profiled = parsePortalGuestTicket({
      level: 0,
      hash: 'c0',
      profile: 'causalab',
    });
    expect(profiled).toEqual({ level: 0, hash: 'c0', profile: 'causalab' });
    expect(guestTicketStillValid(profiled!, hashed)).toBe(true);

    const legacy = parsePortalGuestTicket({ level: 0, hash: 'c0' });
    expect(legacy).toEqual({ level: 0, hash: 'c0', profile: null });
    expect(guestTicketStillValid(legacy!, hashed)).toBe(true);
  });

  it('acepta ticket de Vinculación', () => {
    const ticket = parsePortalGuestTicket({
      level: 3,
      hash: 'v1',
      profile: 'vinculacion',
    });
    expect(ticket).toEqual({
      level: 3,
      hash: 'v1',
      profile: 'vinculacion',
    });
    expect(
      guestTicketStillValid(ticket!, {
        0: '',
        1: '',
        2: '',
        3: 'g3',
        causalab: '',
        vinculacion: 'v1',
      }),
    ).toBe(true);
    expect(
      guestTicketStillValid(ticket!, {
        0: '',
        1: '',
        2: '',
        3: 'g3',
        causalab: '',
        vinculacion: 'otro',
      }),
    ).toBe(false);
  });
});

describe('matchPortalGuestCode', () => {
  it('devuelve el primer nivel general cuyo hash coincide', async () => {
    const ticket = await matchPortalGuestCode(
      '  secreto  ',
      {
        0: 'h0',
        1: 'h1',
        2: 'h2',
        3: 'h3',
        causalab: '',
        vinculacion: '',
      },
      async (plain, hash) => plain === 'secreto' && hash === 'h2',
    );
    expect(ticket).toEqual({ level: 2, hash: 'h2', profile: null });
  });

  it('prioriza perfiles específicos sobre niveles generales', async () => {
    const ticket = await matchPortalGuestCode(
      'causalab',
      {
        0: 'h0',
        1: '',
        2: '',
        3: '',
        causalab: 'hc',
        vinculacion: '',
      },
      async (plain, hash) =>
        (plain === 'causalab' && hash === 'hc') ||
        (plain === 'causalab' && hash === 'h0'),
      );
    expect(ticket).toEqual({ level: 0, hash: 'hc', profile: 'causalab' });
  });

  it('matchea el código de Vinculación', async () => {
    const ticket = await matchPortalGuestCode(
      'vcm-guest',
      {
        0: '',
        1: '',
        2: '',
        3: 'h3',
        causalab: '',
        vinculacion: 'hv',
      },
      async (plain, hash) => plain === 'vcm-guest' && hash === 'hv',
    );
    expect(ticket).toEqual({
      level: 3,
      hash: 'hv',
      profile: 'vinculacion',
    });
  });

  it('rechaza código vacío o sin match', async () => {
    const compare = async () => false;
    expect(
      await matchPortalGuestCode(
        '',
        { 0: '', 1: 'h', 2: '', 3: '', causalab: '', vinculacion: '' },
        compare,
      ),
    ).toBeNull();
    expect(
      await matchPortalGuestCode(
        'x',
        { 0: '', 1: 'h', 2: '', 3: '', causalab: '', vinculacion: '' },
        compare,
      ),
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
