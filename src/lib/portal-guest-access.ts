import type { VitrinaProjectsView } from '@/lib/vitrina-views';

export type PortalGuestLevel = 0 | 1 | 2 | 3;
export type PortalAccessKind = 'none' | 'session' | 'guest';

export type PortalAccess = {
  kind: PortalAccessKind;
  level: PortalGuestLevel | null;
};

export type PortalGuestHashes = {
  0: string;
  1: string;
  2: string;
  3: string;
};

export type PortalGuestTicket = {
  level: PortalGuestLevel;
  hash: string;
};

export const EMPTY_PORTAL_GUEST_HASHES: PortalGuestHashes = {
  0: '',
  1: '',
  2: '',
  3: '',
};

export const PORTAL_GUEST_LEVELS: PortalGuestLevel[] = [0, 1, 2, 3];

export const PORTAL_VIEWS_BY_LEVEL: Record<
  PortalGuestLevel,
  VitrinaProjectsView[]
> = {
  0: ['avances'],
  1: ['proyectos'],
  2: ['proyectos', 'avances', 'indicadores'],
  3: ['proyectos', 'avances', 'analisis', 'indicadores', 'data'],
};

export function isPortalGuestLevel(value: unknown): value is PortalGuestLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export function parsePortalGuestHashes(
  raw: string | null | undefined,
): PortalGuestHashes {
  if (!raw?.trim()) return { ...EMPTY_PORTAL_GUEST_HASHES };
  try {
    const parsed = JSON.parse(raw) as Partial<
      Record<'0' | '1' | '2' | '3', unknown>
    >;
    return {
      0: typeof parsed[0] === 'string' ? parsed[0] : '',
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
    0: hashes[0] ?? '',
    1: hashes[1] ?? '',
    2: hashes[2] ?? '',
    3: hashes[3] ?? '',
  });
}

export function portalGuestConfiguredFlags(hashes: PortalGuestHashes): {
  0: boolean;
  1: boolean;
  2: boolean;
  3: boolean;
} {
  return {
    0: Boolean(hashes[0]),
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
  const hash = typeof value.hash === 'string' ? value.hash : '';
  if (!isPortalGuestLevel(value.level) || !hash) return null;
  return { level: value.level, hash };
}

export function guestTicketStillValid(
  ticket: PortalGuestTicket,
  hashes: PortalGuestHashes,
): boolean {
  return hashes[ticket.level] === ticket.hash && Boolean(ticket.hash);
}

export function portalViewsForLevel(
  level: PortalGuestLevel | null,
): VitrinaProjectsView[] {
  if (level === null) return [];
  return PORTAL_VIEWS_BY_LEVEL[level];
}

export function portalCanSeeView(
  level: PortalGuestLevel | null,
  view: VitrinaProjectsView,
): boolean {
  return portalViewsForLevel(level).includes(view);
}

export function clampPortalView(
  level: PortalGuestLevel | null,
  view: VitrinaProjectsView,
): VitrinaProjectsView {
  if (portalCanSeeView(level, view)) return view;
  return portalViewsForLevel(level)[0] ?? 'proyectos';
}

export const PORTAL_SESSION_ROLES = [
  'Admin',
  'Coordinador',
  'Colaborador',
  'Encargado',
  'Docente',
  'Estudiante',
  'Beneficiario',
] as const;

export type PortalSessionRole = (typeof PORTAL_SESSION_ROLES)[number];

export type PortalSessionRoleLevels = Record<
  PortalSessionRole,
  PortalGuestLevel
>;

export const DEFAULT_PORTAL_SESSION_ROLE_LEVELS: PortalSessionRoleLevels = {
  Admin: 3,
  Coordinador: 3,
  Colaborador: 1,
  Encargado: 1,
  Docente: 1,
  Estudiante: 1,
  Beneficiario: 1,
};

const PORTAL_VIEW_LABELS: Record<VitrinaProjectsView, string> = {
  proyectos: 'Proyectos',
  avances: 'Avances',
  analisis: 'Análisis',
  indicadores: 'Indicadores',
  data: 'Data',
};

export function isPortalSessionRole(value: unknown): value is PortalSessionRole {
  return (
    typeof value === 'string' &&
    (PORTAL_SESSION_ROLES as readonly string[]).includes(value)
  );
}

export function portalLevelCaption(level: PortalGuestLevel): string {
  const labels = PORTAL_VIEWS_BY_LEVEL[level]
    .map((view) => PORTAL_VIEW_LABELS[view])
    .join(', ');
  if (level === 0) return `${labels} (solo Fondo Impulsa)`;
  return labels;
}

/** Nivel 0 en cuentas logueadas: no entran al portal, van a /inicio. El 0 de invitado sigue siendo Causalab. */
export function portalSessionRedirectsToApp(
  kind: PortalAccessKind,
  level: PortalGuestLevel | null,
): boolean {
  return kind === 'session' && level === 0;
}

export function portalCanEnterProjectsPortal(
  kind: PortalAccessKind,
  level: PortalGuestLevel | null,
): boolean {
  if (kind === 'none' || level === null) return false;
  if (portalSessionRedirectsToApp(kind, level)) return false;
  return portalViewsForLevel(level).length > 0;
}

export function portalSessionLevelCaption(level: PortalGuestLevel): string {
  if (level === 0) return 'Redirige a Inicio en la app';
  return portalLevelCaption(level);
}

export function parsePortalSessionRoleLevels(
  raw: string | null | undefined,
): PortalSessionRoleLevels {
  const next = { ...DEFAULT_PORTAL_SESSION_ROLE_LEVELS };
  if (!raw?.trim()) return next;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const role of PORTAL_SESSION_ROLES) {
      if (isPortalGuestLevel(parsed[role])) next[role] = parsed[role];
    }
    return next;
  } catch {
    return { ...DEFAULT_PORTAL_SESSION_ROLE_LEVELS };
  }
}

export function serializePortalSessionRoleLevels(
  levels: PortalSessionRoleLevels,
): string {
  const normalized = parsePortalSessionRoleLevels(JSON.stringify(levels));
  return JSON.stringify(normalized);
}

export function portalReadLevelForSessionRoles(
  availableRoles: readonly string[] | null | undefined,
  roleLevels: PortalSessionRoleLevels = DEFAULT_PORTAL_SESSION_ROLE_LEVELS,
): PortalGuestLevel {
  if (!availableRoles?.length) return 1;
  let max: PortalGuestLevel | null = null;
  for (const role of availableRoles) {
    if (!isPortalSessionRole(role)) continue;
    const level = roleLevels[role];
    if (max === null || level > max) max = level;
  }
  return max ?? 1;
}

export async function matchPortalGuestCode(
  code: string,
  hashes: PortalGuestHashes,
  compare: (plain: string, hash: string) => Promise<boolean>,
): Promise<PortalGuestTicket | null> {
  const plain = code.trim();
  if (!plain) return null;
  for (const level of PORTAL_GUEST_LEVELS) {
    const hash = hashes[level];
    if (!hash) continue;
    if (await compare(plain, hash)) {
      return { level, hash };
    }
  }
  return null;
}
