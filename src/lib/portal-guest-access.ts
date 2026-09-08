import type { VitrinaProjectsView } from '@/lib/vitrina-views';

export type PortalGuestLevel = 0 | 1 | 2 | 3;
export type PortalAccessKind = 'none' | 'session' | 'guest';
export type PortalGuestProfile = 'causalab' | 'vinculacion';

export type PortalAccess = {
  kind: PortalAccessKind;
  level: PortalGuestLevel | null;
  profile?: PortalGuestProfile | null;
};

export type PortalGuestHashes = {
  0: string;
  1: string;
  2: string;
  3: string;
  causalab: string;
  vinculacion: string;
};

export type PortalGuestTicket = {
  level: PortalGuestLevel;
  hash: string;
  profile: PortalGuestProfile | null;
};

export const EMPTY_PORTAL_GUEST_HASHES: PortalGuestHashes = {
  0: '',
  1: '',
  2: '',
  3: '',
  causalab: '',
  vinculacion: '',
};

export const PORTAL_GUEST_LEVELS: PortalGuestLevel[] = [0, 1, 2, 3];
export const PORTAL_GUEST_PROFILES: PortalGuestProfile[] = [
  'causalab',
  'vinculacion',
];

export const PORTAL_GUEST_PROFILE_LEVEL: Record<
  PortalGuestProfile,
  PortalGuestLevel
> = {
  causalab: 0,
  vinculacion: 3,
};

export const PORTAL_VIEWS_BY_LEVEL: Record<
  PortalGuestLevel,
  VitrinaProjectsView[]
> = {
  0: ['avances', 'indicadores'],
  1: ['proyectos'],
  2: ['proyectos', 'avances', 'indicadores'],
  3: ['proyectos', 'avances', 'analisis', 'indicadores', 'data', 'vinculamos'],
};

export function isPortalGuestLevel(value: unknown): value is PortalGuestLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

export function isPortalGuestProfile(
  value: unknown,
): value is PortalGuestProfile {
  return value === 'causalab' || value === 'vinculacion';
}

function asHash(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parsePortalGuestHashes(
  raw: string | null | undefined,
): PortalGuestHashes {
  if (!raw?.trim()) return { ...EMPTY_PORTAL_GUEST_HASHES };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hasProfiles =
      Object.prototype.hasOwnProperty.call(parsed, 'causalab') ||
      Object.prototype.hasOwnProperty.call(parsed, 'vinculacion');
    const legacyZero = asHash(parsed['0']);
    return {
      0: hasProfiles ? legacyZero : '',
      1: asHash(parsed['1']),
      2: asHash(parsed['2']),
      3: asHash(parsed['3']),
      causalab: hasProfiles ? asHash(parsed.causalab) : legacyZero,
      vinculacion: asHash(parsed.vinculacion),
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
    causalab: hashes.causalab ?? '',
    vinculacion: hashes.vinculacion ?? '',
  });
}

export function portalGuestConfiguredFlags(hashes: PortalGuestHashes): {
  0: boolean;
  1: boolean;
  2: boolean;
  3: boolean;
  causalab: boolean;
  vinculacion: boolean;
} {
  return {
    0: Boolean(hashes[0]),
    1: Boolean(hashes[1]),
    2: Boolean(hashes[2]),
    3: Boolean(hashes[3]),
    causalab: Boolean(hashes.causalab),
    vinculacion: Boolean(hashes.vinculacion),
  };
}

export function parsePortalGuestTicket(
  raw: unknown,
): PortalGuestTicket | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as { level?: unknown; hash?: unknown; profile?: unknown };
  const hash = typeof value.hash === 'string' ? value.hash : '';
  if (!isPortalGuestLevel(value.level) || !hash) return null;
  const profile = isPortalGuestProfile(value.profile) ? value.profile : null;
  return { level: value.level, hash, profile };
}

export function guestTicketStillValid(
  ticket: PortalGuestTicket,
  hashes: PortalGuestHashes,
): boolean {
  if (!ticket.hash) return false;
  if (ticket.profile) {
    return hashes[ticket.profile] === ticket.hash;
  }
  if (hashes[ticket.level] === ticket.hash) return true;
  if (ticket.level === 0 && hashes.causalab === ticket.hash) return true;
  return false;
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

export const PORTAL_CAUSALAB_FONDO = 'Fondo Impulsa';

export function portalNeedsVitrinaProyectos(
  level: PortalGuestLevel | null,
): boolean {
  return (
    portalCanSeeView(level, 'proyectos') ||
    portalCanSeeView(level, 'indicadores') ||
    portalCanSeeView(level, 'analisis') ||
    portalCanSeeView(level, 'data')
  );
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
  vinculamos: 'Vinculamos',
};

export function isPortalSessionRole(value: unknown): value is PortalSessionRole {
  return (
    typeof value === 'string' &&
    (PORTAL_SESSION_ROLES as readonly string[]).includes(value)
  );
}

export function portalLevelCaption(level: PortalGuestLevel): string {
  return PORTAL_VIEWS_BY_LEVEL[level]
    .map((view) => PORTAL_VIEW_LABELS[view])
    .join(', ');
}

export function portalProfileCaption(profile: PortalGuestProfile): string {
  if (profile === 'causalab') {
    return `${portalLevelCaption(0)} (solo Fondo Impulsa)`;
  }
  return 'Toda la información de lectura, sin chat IA ni ingreso a la app';
}

/** Nivel 0 en cuentas logueadas: no entran al portal, van a /inicio. */
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

export function portalIsCausalab(access: PortalAccess): boolean {
  return access.kind === 'guest' && access.profile === 'causalab';
}

export function portalCanUseAiChat(access: PortalAccess): boolean {
  if (access.kind === 'none' || access.level === null) return false;
  if (portalSessionRedirectsToApp(access.kind, access.level)) return false;
  if (access.profile === 'causalab' || access.profile === 'vinculacion') {
    return false;
  }
  return portalCanSeeView(access.level, 'proyectos');
}

export function portalCanEnterApp(access: PortalAccess): boolean {
  return !(access.kind === 'guest' && access.profile === 'vinculacion');
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
  for (const profile of PORTAL_GUEST_PROFILES) {
    const hash = hashes[profile];
    if (!hash) continue;
    if (await compare(plain, hash)) {
      return {
        level: PORTAL_GUEST_PROFILE_LEVEL[profile],
        hash,
        profile,
      };
    }
  }
  for (const level of PORTAL_GUEST_LEVELS) {
    const hash = hashes[level];
    if (!hash) continue;
    if (await compare(plain, hash)) {
      return { level, hash, profile: null };
    }
  }
  return null;
}
