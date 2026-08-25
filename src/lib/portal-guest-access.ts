import type { VitrinaProjectsView } from '@/lib/vitrina-views';

export type PortalGuestLevel = 1 | 2 | 3;
export type PortalAccessKind = 'none' | 'session' | 'guest';

export type PortalAccess = {
  kind: PortalAccessKind;
  level: 0 | PortalGuestLevel;
};

export type PortalGuestHashes = {
  1: string;
  2: string;
  3: string;
};

export type PortalGuestTicket = {
  level: PortalGuestLevel;
  hash: string;
};

export const EMPTY_PORTAL_GUEST_HASHES: PortalGuestHashes = {
  1: '',
  2: '',
  3: '',
};

const LEVELS: PortalGuestLevel[] = [1, 2, 3];

export const PORTAL_VIEWS_BY_LEVEL: Record<
  PortalGuestLevel,
  VitrinaProjectsView[]
> = {
  1: ['proyectos'],
  2: ['proyectos', 'indicadores', 'avances'],
  3: ['proyectos', 'analisis', 'indicadores', 'avances', 'data'],
};

export function parsePortalGuestHashes(
  raw: string | null | undefined,
): PortalGuestHashes {
  if (!raw?.trim()) return { ...EMPTY_PORTAL_GUEST_HASHES };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<'1' | '2' | '3', unknown>>;
    return {
      1: typeof parsed[1] === 'string' ? parsed[1] : '',
      2: typeof parsed[2] === 'string' ? parsed[2] : '',
      3: typeof parsed[3] === 'string' ? parsed[3] : '',
    };
  } catch {
    return { ...EMPTY_PORTAL_GUEST_HASHES };
  }
}

export function serializePortalGuestHashes(hashes: PortalGuestHashes): string {
  return JSON.stringify({
    1: hashes[1] ?? '',
    2: hashes[2] ?? '',
    3: hashes[3] ?? '',
  });
}

export function portalGuestConfiguredFlags(hashes: PortalGuestHashes): {
  1: boolean;
  2: boolean;
  3: boolean;
} {
  return {
    1: Boolean(hashes[1]),
    2: Boolean(hashes[2]),
    3: Boolean(hashes[3]),
  };
}

export function parsePortalGuestTicket(
  raw: unknown,
): PortalGuestTicket | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as { level?: unknown; hash?: unknown };
  const level = value.level;
  const hash = typeof value.hash === 'string' ? value.hash : '';
  if ((level !== 1 && level !== 2 && level !== 3) || !hash) return null;
  return { level, hash };
}

export function guestTicketStillValid(
  ticket: PortalGuestTicket,
  hashes: PortalGuestHashes,
): boolean {
  return hashes[ticket.level] === ticket.hash && Boolean(ticket.hash);
}

export function portalViewsForLevel(
  level: 0 | PortalGuestLevel,
): VitrinaProjectsView[] {
  if (level === 0) return [];
  return PORTAL_VIEWS_BY_LEVEL[level];
}

export function portalCanSeeView(
  level: 0 | PortalGuestLevel,
  view: VitrinaProjectsView,
): boolean {
  return portalViewsForLevel(level).includes(view);
}

export function clampPortalView(
  level: 0 | PortalGuestLevel,
  view: VitrinaProjectsView,
): VitrinaProjectsView {
  return portalCanSeeView(level, view) ? view : 'proyectos';
}

const PORTAL_SESSION_LEVEL_3_ROLES = ['Admin', 'Coordinador'] as const;

/** Lectura del portal para una cuenta logueada: Admin/Coordinador = 3; el resto = 1. */
export function portalReadLevelForSessionRoles(
  availableRoles: readonly string[] | null | undefined,
): PortalGuestLevel {
  if (
    PORTAL_SESSION_LEVEL_3_ROLES.some((role) =>
      availableRoles?.includes(role),
    )
  ) {
    return 3;
  }
  return 1;
}

export async function matchPortalGuestCode(
  code: string,
  hashes: PortalGuestHashes,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<PortalGuestTicket | null> {
  const plain = code.trim();
  if (!plain) return null;
  for (const level of LEVELS) {
    const hash = hashes[level];
    if (!hash) continue;
    if (await compare(plain, hash)) {
      return { level, hash };
    }
  }
  return null;
}
