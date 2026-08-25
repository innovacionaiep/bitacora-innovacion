import { cookies } from 'next/headers';
import { decryptSecret, encryptSecret } from '@/lib/vitrina-ai-crypto';
import {
  parsePortalGuestTicket,
  type PortalGuestTicket,
} from '@/lib/portal-guest-access';
import { readRequiredEnv } from '@/lib/secrets/env-secrets';
import {
  PORTAL_GUEST_COOKIE,
  PORTAL_GUEST_COOKIE_MAX_AGE_SEC,
} from '@/lib/portal-guest-settings';

function signingSecret(): string | null {
  return readRequiredEnv('NEXTAUTH_SECRET');
}

export async function readPortalGuestTicket(): Promise<PortalGuestTicket | null> {
  const secret = signingSecret();
  if (!secret) return null;
  const jar = await cookies();
  const raw = jar.get(PORTAL_GUEST_COOKIE)?.value;
  if (!raw) return null;
  const json = decryptSecret(raw, secret);
  if (!json) return null;
  try {
    return parsePortalGuestTicket(JSON.parse(json));
  } catch {
    return null;
  }
}

export async function writePortalGuestTicket(
  ticket: PortalGuestTicket,
): Promise<boolean> {
  const secret = signingSecret();
  if (!secret) return false;
  const jar = await cookies();
  jar.set(PORTAL_GUEST_COOKIE, encryptSecret(JSON.stringify(ticket), secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PORTAL_GUEST_COOKIE_MAX_AGE_SEC,
  });
  return true;
}

export async function clearPortalGuestCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(PORTAL_GUEST_COOKIE);
}
