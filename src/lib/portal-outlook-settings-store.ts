import prisma from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/vitrina-ai-crypto';
import {
  isPortalOutlookConfigured,
  parseStoredPortalOutlook,
  serializePortalOutlookStored,
  PORTAL_OUTLOOK_SETTING_KEY,
  type PortalOutlookStored,
} from '@/lib/portal-outlook-settings';
import { readRequiredEnv } from '@/lib/secrets/env-secrets';

export type PortalOutlookCredentials = {
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
};

export function getPortalOutlookEncryptionSecret(): string | null {
  return readRequiredEnv('NEXTAUTH_SECRET');
}

export async function readPortalOutlookStored(): Promise<PortalOutlookStored | null> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PORTAL_OUTLOOK_SETTING_KEY },
      select: { value: true },
    });
    return parseStoredPortalOutlook(row?.value);
  } catch (e) {
    console.error('[portal] readPortalOutlookStored', e);
    return null;
  }
}

export async function writePortalOutlookStored(
  stored: PortalOutlookStored,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: PORTAL_OUTLOOK_SETTING_KEY },
    create: {
      key: PORTAL_OUTLOOK_SETTING_KEY,
      value: serializePortalOutlookStored(stored),
    },
    update: { value: serializePortalOutlookStored(stored) },
  });
}

export async function readPortalOutlookCredentials(): Promise<PortalOutlookCredentials | null> {
  const stored = await readPortalOutlookStored();
  if (!isPortalOutlookConfigured(stored) || !stored) return null;
  const secret = getPortalOutlookEncryptionSecret();
  if (!secret) return null;
  const pass = decryptSecret(stored.enc, secret);
  if (!pass) return null;
  return {
    user: stored.user,
    pass,
    host: stored.host,
    port: stored.port,
    secure: stored.secure,
  };
}

export function encryptPortalOutlookPassword(
  password: string,
  secret: string,
): string {
  return encryptSecret(password, secret);
}
