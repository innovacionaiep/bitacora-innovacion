export const PUBLIC_LINK_COOKIE = 'gp_public_link';
export const PUBLIC_PROJECT_PATH_PREFIX = '/p';

const TOKEN_HEX_RE = /^[a-f0-9]{64}$/;

export type PublicLinkRecord = {
  token: string;
  proyectoId: string;
  revokedAt: Date | string | null;
};

export function generatePublicLinkToken(randomBytes: (size: number) => Buffer): string {
  return randomBytes(32).toString('hex');
}

export function isPublicLinkTokenFormat(token: string): boolean {
  return TOKEN_HEX_RE.test(token);
}

export function isPublicLinkActive(
  link: Pick<PublicLinkRecord, 'revokedAt'> | null | undefined
): boolean {
  if (!link) return false;
  return link.revokedAt == null;
}

export function publicProjectPath(token: string): string {
  return `${PUBLIC_PROJECT_PATH_PREFIX}/${token}`;
}

export function publicLinkAbsoluteUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${publicProjectPath(token)}`;
}

export const PUBLIC_SHARE_ORIGIN_DEFAULT =
  'https://bitacora-innovacion.vercel.app';

export function resolvePublicLinkOrigin(
  ...candidates: Array<string | null | undefined>
): string {
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(
        trimmed.includes('://') ? trimmed : `https://${trimmed}`
      );
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        continue;
      }
      return `${url.protocol}//${url.host}`;
    } catch {
      continue;
    }
  }
  return PUBLIC_SHARE_ORIGIN_DEFAULT;
}

export function isPublicProjectPathname(pathname: string): boolean {
  return (
    pathname === PUBLIC_PROJECT_PATH_PREFIX ||
    pathname.startsWith(`${PUBLIC_PROJECT_PATH_PREFIX}/`)
  );
}

export function publicLinkTokenFromPathname(pathname: string): string | null {
  if (!isPublicProjectPathname(pathname)) return null;
  const token = pathname.slice(PUBLIC_PROJECT_PATH_PREFIX.length + 1).split('/')[0];
  if (!token || !isPublicLinkTokenFormat(token)) return null;
  return token;
}

export type AuthzGateLike =
  | { ok: true; user: { id: string } }
  | { ok: false; error: string };

export const PUBLIC_READER_USER = {
  id: '__public__',
  name: 'Público',
  email: null as string | null,
  availableRoles: [] as string[],
  activeRole: null as string | null,
};

export function resolveProjectReadAccess(args: {
  proyectoId: string;
  sessionGate: AuthzGateLike;
  publicToken: string | null;
  tokenProyectoId: string | null;
}): AuthzGateLike {
  if (!args.proyectoId) {
    return { ok: false, error: 'Proyecto no especificado' };
  }
  if (args.sessionGate.ok) return args.sessionGate;
  if (
    args.publicToken &&
    args.tokenProyectoId &&
    args.tokenProyectoId === args.proyectoId
  ) {
    return { ok: true, user: PUBLIC_READER_USER };
  }
  return args.sessionGate;
}

export function canGeneratePublicLink(hasActiveLink: boolean): boolean {
  return !hasActiveLink;
}
