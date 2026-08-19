import prisma from '@/lib/prisma';
import { VITRINA_VIDEOS } from '@/components/vitrina/vitrina-content';
import type { VitrinaVideo } from '@/components/vitrina/vitrina-content';
import {
  parseStoredVitrinaVideos,
  VITRINA_VIDEOS_SETTING_KEY,
} from '@/lib/vitrina-videos';

export async function readVitrinaVideos(): Promise<VitrinaVideo[]> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: VITRINA_VIDEOS_SETTING_KEY },
      select: { value: true },
    });
    return parseStoredVitrinaVideos(row?.value) ?? VITRINA_VIDEOS;
  } catch (e) {
    console.error('[vitrina] readVitrinaVideos', e);
    return VITRINA_VIDEOS;
  }
}

export async function writeVitrinaVideos(videos: VitrinaVideo[]): Promise<void> {
  const value = JSON.stringify(videos);
  await prisma.systemSetting.upsert({
    where: { key: VITRINA_VIDEOS_SETTING_KEY },
    create: {
      key: VITRINA_VIDEOS_SETTING_KEY,
      value,
    },
    update: { value },
  });
}
