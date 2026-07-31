import prisma from '@/lib/prisma';
import { MAINTENANCE_SETTING_KEY } from '@/lib/maintenance';

export async function readMaintenanceEnabled(): Promise<boolean> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: MAINTENANCE_SETTING_KEY },
      select: { value: true },
    });
    return row?.value === 'true';
  } catch (e) {
    console.error('[maintenance] readMaintenanceEnabled', e);
    return false;
  }
}

export async function writeMaintenanceEnabled(enabled: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: MAINTENANCE_SETTING_KEY },
    create: {
      key: MAINTENANCE_SETTING_KEY,
      value: enabled ? 'true' : 'false',
    },
    update: {
      value: enabled ? 'true' : 'false',
    },
  });
}
