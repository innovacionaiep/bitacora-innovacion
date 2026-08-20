import prisma from '@/lib/prisma';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  parseStoredVitrinaProyectos,
  VITRINA_PROYECTOS_SETTING_KEY,
} from '@/lib/vitrina-proyectos';

export async function readVitrinaProyectos(): Promise<VitrinaProyecto[]> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: VITRINA_PROYECTOS_SETTING_KEY },
      select: { value: true },
    });
    return parseStoredVitrinaProyectos(row?.value) ?? [];
  } catch (e) {
    console.error('[vitrina] readVitrinaProyectos', e);
    return [];
  }
}

export async function writeVitrinaProyectos(
  proyectos: VitrinaProyecto[],
): Promise<void> {
  const value = JSON.stringify(proyectos);
  await prisma.systemSetting.upsert({
    where: { key: VITRINA_PROYECTOS_SETTING_KEY },
    create: {
      key: VITRINA_PROYECTOS_SETTING_KEY,
      value,
    },
    update: { value },
  });
}
