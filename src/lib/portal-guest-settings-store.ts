import prisma from '@/lib/prisma';
import {
  parsePortalGuestHashes,
  parsePortalSessionRoleLevels,
  serializePortalGuestHashes,
  serializePortalSessionRoleLevels,
  type PortalGuestHashes,
  type PortalSessionRoleLevels,
} from '@/lib/portal-guest-access';
import {
  PORTAL_GUEST_SETTING_KEY,
  PORTAL_SESSION_ROLE_LEVELS_KEY,
} from '@/lib/portal-guest-settings';

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

export async function readPortalSessionRoleLevels(): Promise<PortalSessionRoleLevels> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PORTAL_SESSION_ROLE_LEVELS_KEY },
      select: { value: true },
    });
    return parsePortalSessionRoleLevels(row?.value);
  } catch (e) {
    console.error('[portal] readPortalSessionRoleLevels', e);
    return parsePortalSessionRoleLevels(null);
  }
}

export async function writePortalSessionRoleLevels(
  levels: PortalSessionRoleLevels,
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: PORTAL_SESSION_ROLE_LEVELS_KEY },
    create: {
      key: PORTAL_SESSION_ROLE_LEVELS_KEY,
      value: serializePortalSessionRoleLevels(levels),
    },
    update: {
      value: serializePortalSessionRoleLevels(levels),
    },
  });
}
