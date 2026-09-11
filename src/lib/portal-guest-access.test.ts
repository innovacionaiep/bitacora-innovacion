import { describe, expect, it } from 'vitest';
import {
  clampPortalView,
  guestTicketStillValid,
  matchPortalGuestCode,
  parsePortalGuestHashes,
  parsePortalGuestTicket,
  portalCanEnterApp,
  portalCanManageSettings,
  portalCanSeeView,
  portalCanUseAiChat,
  portalGuestConfiguredFlags,
  portalIsCausalab,
  portalLevelCaption,
  portalNeedsVitrinaProyectos,
  portalPageLoadsDeferredTabs,
  portalProfileCaption,
  portalReadLevelForSessionRoles,
  portalSessionLevelCaption,
  portalSessionRedirectsToApp,
  portalViewsForAccess,
  portalViewsForLevel,
  serializePortalGuestHashes,
  EMPTY_PORTAL_GUEST_HASHES,
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
      visor: 'hv2',
      comunicaciones: 'hcom',
    });
    expect(parsePortalGuestHashes(raw)).toEqual({
      0: 'h0',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: 'hc',
      vinculacion: 'hv',
      visor: 'hv2',
      comunicaciones: 'hcom',
    });
    expect(portalGuestConfiguredFlags(parsePortalGuestHashes(raw))).toEqual({
      0: true,
      1: true,
      2: false,
      3: true,
      causalab: true,
      vinculacion: true,
      visor: true,
      comunicaciones: true,
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
      visor: '',
      comunicaciones: '',
    });
    expect(parsePortalGuestHashes('{"0":"old0","1":"h1","2":"","3":"h3"}')).toEqual({
      0: '',
      1: 'h1',
      2: '',
      3: 'h3',
      causalab: 'old0',
      vinculacion: '',
      visor: '',
      comunicaciones: '',
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
      visor: '',
      comunicaciones: '',
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
      visor: '',
      comunicaciones: '',
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
    expect(portalPageLoadsDeferredTabs(undefined)).toBe(false);
    expect(portalPageLoadsDeferredTabs('proyectos')).toBe(false);
    expect(portalPageLoadsDeferredTabs('avances')).toBe(true);
    expect(portalPageLoadsDeferredTabs('vinculamos')).toBe(true);
    expect(portalPageLoadsDeferredTabs('analisis')).toBe(true);
    expect(portalLevelCaption(0)).toBe('Avances, Indicadores');
  });

  it('sin acceso no ve ninguna vista', () => {
    expect(portalViewsForLevel(null)).toEqual([]);
    expect(portalCanSeeView(null, 'avances')).toBe(false);
  });

  it('nivel 1 ve Proyectos y Mapa', () => {
    expect(portalViewsForLevel(1)).toEqual(['proyectos', 'mapa']);
    expect(portalCanSeeView(1, 'analisis')).toBe(false);
    expect(portalCanSeeView(1, 'proyectos')).toBe(true);
    expect(portalCanSeeView(1, 'mapa')).toBe(true);
  });

  it('nivel 2 suma avances e indicadores', () => {
    expect(portalViewsForLevel(2)).toEqual([
      'proyectos',
      'mapa',
      'avances',
      'indicadores',
    ]);
    expect(portalCanSeeView(2, 'data')).toBe(false);
  });

  it('nivel 3 ve todo, con Mapa entre Proyectos y Avances', () => {
    expect(portalViewsForLevel(3)).toEqual([
      'proyectos',
      'mapa',
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

  it('Visor ve Proyectos, Mapa e Indicadores, con chat IA', () => {
    expect(portalViewsForAccess(1, 'visor')).toEqual([
      'proyectos',
      'mapa',
      'indicadores',
    ]);
    expect(portalCanSeeView(1, 'avances', 'visor')).toBe(false);
    expect(portalCanSeeView(1, 'analisis', 'visor')).toBe(false);
    expect(portalCanSeeView(1, 'indicadores', 'visor')).toBe(true);
    expect(portalCanSeeView(1, 'mapa', 'visor')).toBe(true);
    expect(clampPortalView(1, 'avances', 'visor')).toBe('proyectos');
    expect(portalProfileCaption('visor')).toBe(
      'Proyectos, Mapa e Indicadores, con chat IA',
    );
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 1, profile: 'visor' }),
    ).toBe(true);
    expect(
      portalCanEnterApp({ kind: 'guest', level: 1, profile: 'visor' }),
    ).toBe(true);
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

  it('Comunicaciones ve todos los tabs excepto Data, con chat IA, sin ingreso a la app', () => {
    expect(portalViewsForAccess(3, 'comunicaciones')).toEqual([
      'proyectos',
      'mapa',
      'avances',
      'analisis',
      'indicadores',
      'vinculamos',
    ]);
    expect(portalCanSeeView(3, 'data', 'comunicaciones')).toBe(false);
    expect(clampPortalView(3, 'data', 'comunicaciones')).toBe('proyectos');
    expect(portalProfileCaption('comunicaciones')).toBe(
      'Toda la información de lectura excepto Data, con chat IA, sin ingreso a la app',
    );
    expect(
      portalCanUseAiChat({ kind: 'guest', level: 3, profile: 'comunicaciones' }),
    ).toBe(true);
    expect(
      portalCanEnterApp({
        kind: 'guest',
        level: 3,
        profile: 'comunicaciones',
      }),
    ).toBe(false);
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

  it('ningún invitado configura el portal ni edita información', () => {
    const guests = [
      { kind: 'guest' as const, level: 0 as const, profile: null },
      { kind: 'guest' as const, level: 1 as const, profile: null },
      { kind: 'guest' as const, level: 2 as const, profile: null },
      { kind: 'guest' as const, level: 3 as const, profile: null },
      { kind: 'guest' as const, level: 0 as const, profile: 'causalab' as const },
      {
        kind: 'guest' as const,
        level: 3 as const,
        profile: 'vinculacion' as const,
      },
      { kind: 'guest' as const, level: 1 as const, profile: 'visor' as const },
      {
        kind: 'guest' as const,
        level: 3 as const,
        profile: 'comunicaciones' as const,
      },
    ];
    for (const access of guests) {
      expect(portalCanManageSettings(access, false)).toBe(false);
      expect(portalCanManageSettings(access, true)).toBe(false);
    }
    expect(
      portalCanManageSettings({ kind: 'none', level: null, profile: null }, true),
    ).toBe(false);
    expect(
      portalCanManageSettings(
        { kind: 'session', level: 3, profile: null },
        false,
      ),
    ).toBe(false);
    expect(
      portalCanManageSettings(
        { kind: 'session', level: 3, profile: null },
        true,
      ),
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
        visor: '',
      comunicaciones: '',
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
        visor: '',
      comunicaciones: '',
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
      visor: '',
      comunicaciones: '',
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
        visor: '',
      comunicaciones: '',
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
        visor: '',
        comunicaciones: '',
      }),
    ).toBe(false);
  });

  it('acepta ticket de Comunicaciones', () => {
    const ticket = parsePortalGuestTicket({
      level: 3,
      hash: 'c1',
      profile: 'comunicaciones',
    });
    expect(ticket).toEqual({
      level: 3,
      hash: 'c1',
      profile: 'comunicaciones',
    });
    expect(
      guestTicketStillValid(ticket!, {
        ...EMPTY_PORTAL_GUEST_HASHES,
        3: 'g3',
        comunicaciones: 'c1',
      }),
    ).toBe(true);
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
        visor: '',
      comunicaciones: '',
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
        visor: '',
      comunicaciones: '',
      },
      async (plain, hash) =>
        (plain === 'causalab' && hash === 'hc') ||
        (plain === 'causalab' && hash === 'h0'),
      );
    expect(ticket).toEqual({ level: 0, hash: 'hc', profile: 'causalab' });
  });

  it('matchea el código de Visor', async () => {
    const ticket = await matchPortalGuestCode(
      'visor-guest',
      {
        0: '',
        1: 'h1',
        2: '',
        3: '',
        causalab: '',
        vinculacion: '',
        visor: 'hs',
        comunicaciones: '',
      },
      async (plain, hash) => plain === 'visor-guest' && hash === 'hs',
    );
    expect(ticket).toEqual({
      level: 1,
      hash: 'hs',
      profile: 'visor',
    });
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
        visor: '',
      comunicaciones: '',
      },
      async (plain, hash) => plain === 'vcm-guest' && hash === 'hv',
    );
    expect(ticket).toEqual({
      level: 3,
      hash: 'hv',
      profile: 'vinculacion',
    });
  });

  it('matchea el código de Comunicaciones', async () => {
    const ticket = await matchPortalGuestCode(
      'com-guest',
      {
        ...EMPTY_PORTAL_GUEST_HASHES,
        3: 'h3',
        comunicaciones: 'hc2',
      },
      async (plain, hash) => plain === 'com-guest' && hash === 'hc2',
    );
    expect(ticket).toEqual({
      level: 3,
      hash: 'hc2',
      profile: 'comunicaciones',
    });
  });

  it('rechaza código vacío o sin match', async () => {
    const compare = async () => false;
    expect(
      await matchPortalGuestCode(
        '',
        {
          ...EMPTY_PORTAL_GUEST_HASHES,
          1: 'h',
        },
        compare,
      ),
    ).toBeNull();
    expect(
      await matchPortalGuestCode(
        'x',
        {
          ...EMPTY_PORTAL_GUEST_HASHES,
          1: 'h',
        },
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
    expect(portalSessionLevelCaption(1)).toBe('Proyectos, Mapa');
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
