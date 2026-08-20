import prisma from '@/lib/prisma';
import { decryptSecret, encryptSecret } from '@/lib/vitrina-ai-crypto';
import {
  isVitrinaAiConfigured,
  parseStoredVitrinaAi,
  serializeVitrinaAiStored,
  VITRINA_AI_DEFAULT_MODEL,
  VITRINA_AI_SETTING_KEY,
  type VitrinaAiStored,
} from '@/lib/vitrina-ai-settings';
import { readRequiredEnv } from '@/lib/secrets/env-secrets';

export function getVitrinaAiEncryptionSecret(): string | null {
  return readRequiredEnv('NEXTAUTH_SECRET');
}

export async function readVitrinaAiStored(): Promise<VitrinaAiStored | null> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: VITRINA_AI_SETTING_KEY },
      select: { value: true },
    });
    return parseStoredVitrinaAi(row?.value);
  } catch (e) {
    console.error('[vitrina] readVitrinaAiStored', e);
    return null;
  }
}

export async function writeVitrinaAiStored(stored: VitrinaAiStored): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: VITRINA_AI_SETTING_KEY },
    create: {
      key: VITRINA_AI_SETTING_KEY,
      value: serializeVitrinaAiStored(stored),
    },
    update: { value: serializeVitrinaAiStored(stored) },
  });
}

export async function readVitrinaAiCredentials(): Promise<{
  apiKey: string;
  model: string;
} | null> {
  const stored = await readVitrinaAiStored();
  if (!isVitrinaAiConfigured(stored) || !stored) return null;
  const secret = getVitrinaAiEncryptionSecret();
  if (!secret) return null;
  const apiKey = decryptSecret(stored.enc, secret);
  if (!apiKey) return null;
  return {
    apiKey,
    model: stored.model || VITRINA_AI_DEFAULT_MODEL,
  };
}

export function encryptVitrinaAiKey(apiKey: string, secret: string): string {
  return encryptSecret(apiKey, secret);
}
