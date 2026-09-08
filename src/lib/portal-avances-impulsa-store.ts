import prisma from '@/lib/prisma';
import {
  parseStoredImpulsa,
  parseStoredVcm,
  serializeImpulsaStored,
  PORTAL_AVANCES_IMPULSA_SETTING_KEY,
  PORTAL_AVANCES_VCM_SETTING_KEY,
  type PortalAvancesImpulsaStored,
} from '@/lib/portal-avances-impulsa';

async function readExcelAvancesStored(
  key: string,
  parse: (value: string | null | undefined) => PortalAvancesImpulsaStored,
): Promise<PortalAvancesImpulsaStored> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return parse(row?.value);
  } catch (e) {
    console.error(`[portal] readExcelAvancesStored ${key}`, e);
    return parse(null);
  }
}

async function writeExcelAvancesStored(
  key: string,
  stored: PortalAvancesImpulsaStored,
): Promise<void> {
  const value = serializeImpulsaStored(stored);
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function readImpulsaStored(): Promise<PortalAvancesImpulsaStored> {
  return readExcelAvancesStored(
    PORTAL_AVANCES_IMPULSA_SETTING_KEY,
    parseStoredImpulsa,
  );
}

export async function writeImpulsaStored(
  stored: PortalAvancesImpulsaStored,
): Promise<void> {
  await writeExcelAvancesStored(PORTAL_AVANCES_IMPULSA_SETTING_KEY, stored);
}

export async function readVcmStored(): Promise<PortalAvancesImpulsaStored> {
  return readExcelAvancesStored(PORTAL_AVANCES_VCM_SETTING_KEY, parseStoredVcm);
}

export async function writeVcmStored(
  stored: PortalAvancesImpulsaStored,
): Promise<void> {
  await writeExcelAvancesStored(PORTAL_AVANCES_VCM_SETTING_KEY, stored);
}
