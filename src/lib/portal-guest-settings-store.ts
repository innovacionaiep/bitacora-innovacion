import prisma from '@/lib/prisma';
import {
  parsePortalGuestHashes,
  serializePortalGuestHashes,
  type PortalGuestHashes,
} from '@/lib/portal-guest-access';
import { PORTAL_GUEST_SETTING_KEY } from '@/lib/portal-guest-settings';

export async function readPortalGuestHashes(): Promise<PortalGuestHashes> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PORTAL_GUEST_SETTING_KEY },
      select: { value: true },
    });
    return parsePortalGuestHashes(row?.value);
  } catch (e) {
    console.error('[portal] readPortalGuestHashes', e);
    return parsePortalGuestHashes(null);
  }
}

export async function writePortalGuestHashes(
  hashes: PortalGuestHashes,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: PORTAL_GUEST_SETTING_KEY },
    create: {
      key: PORTAL_GUEST_SETTING_KEY,
      value: serializePortalGuestHashes(hashes),
    },
    update: {
      value: serializePortalGuestHashes(hashes),
    },
  });
}
