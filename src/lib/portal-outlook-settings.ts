export const PORTAL_OUTLOOK_SETTING_KEY = 'portal_outlook';
export const PORTAL_OUTLOOK_DEFAULT_HOST = 'smtp.office365.com';
export const PORTAL_OUTLOOK_DEFAULT_PORT = 587;
export const PORTAL_OUTLOOK_DEFAULT_SECURE = false;

export type PortalOutlookStored = {
  user: string;
  enc: string;
  host: string;
  port: number;
  secure: boolean;
};

const HOST_RE = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePortalOutlookHost(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 253 || !HOST_RE.test(raw)) {
    return PORTAL_OUTLOOK_DEFAULT_HOST;
  }
  return raw.toLowerCase();
}

export function normalizePortalOutlookPort(value: unknown): number {
  const n =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    return PORTAL_OUTLOOK_DEFAULT_PORT;
  }
  return n;
}

export function normalizePortalOutlookUser(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 254 || !EMAIL_RE.test(raw)) return '';
  return raw;
}

export function normalizePortalOutlookSecure(value: unknown): boolean {
  return value === true || value === 'true';
}

export function maskPortalOutlookPassword(password: string): string {
  const trimmed = password.trim();
  if (!trimmed) return '';
  return `••••${trimmed.slice(-4)}`;
}

export function serializePortalOutlookStored(
  stored: PortalOutlookStored,
): string {
  return JSON.stringify({
    user: normalizePortalOutlookUser(stored.user),
    enc: stored.enc,
    host: normalizePortalOutlookHost(stored.host),
    port: normalizePortalOutlookPort(stored.port),
    secure: Boolean(stored.secure),
  });
}

export function parseStoredPortalOutlook(
  value: string | null | undefined,
): PortalOutlookStored | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const rec = parsed as {
      user?: unknown;
      enc?: unknown;
      host?: unknown;
      port?: unknown;
      secure?: unknown;
    };
    if (typeof rec.enc !== 'string') return null;
    return {
      user: normalizePortalOutlookUser(rec.user),
      enc: rec.enc,
      host: normalizePortalOutlookHost(rec.host),
      port: normalizePortalOutlookPort(rec.port),
      secure: normalizePortalOutlookSecure(rec.secure),
    };
  } catch {
    return null;
  }
}

export function isPortalOutlookConfigured(
  stored: PortalOutlookStored | null,
): boolean {
  return Boolean(stored?.user && stored.enc);
}
