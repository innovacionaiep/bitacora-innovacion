export const PORTAL_GUEST_SETTING_KEY = 'portal_guest_codes';
export const PORTAL_GUEST_COOKIE = 'portal_guest';
export const PORTAL_GUEST_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;
export const PORTAL_GUEST_SALT_ROUNDS = 10;

export function revalidatePortalPaths() {
  return ['/', '/vitrina'] as const;
}
