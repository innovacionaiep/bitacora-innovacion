import prisma from '@/lib/prisma';
import {
  parseStoredImpulsa,
  serializeImpulsaStored,
  PORTAL_AVANCES_IMPULSA_SETTING_KEY,
  type PortalAvancesImpulsaStored,
} from '@/lib/portal-avances-impulsa';

export async function readImpulsaStored(): Promise<PortalAvancesImpulsaStored> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PORTAL_AVANCES_IMPULSA_SETTING_KEY },
      select: { value: true },
    });
    return parseStoredImpulsa(row?.value);
  } catch (e) {
    console.error('[portal] readImpulsaStored', e);
    return parseStoredImpulsa(null);
  }
}

export async function writeImpulsaStored(
  stored: PortalAvancesImpulsaStored,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: PORTAL_AVANCES_IMPULSA_SETTING_KEY },
    create: {
      key: PORTAL_AVANCES_IMPULSA_SETTING_KEY,
      value: serializeImpulsaStored(stored),
    },
    update: { value: serializeImpulsaStored(stored) },
  });
}
