'use server';

import { revalidatePath } from 'next/cache';
import {
  getNovedadesUnlockPassword,
  secretsMatch,
} from '@/lib/secrets/env-secrets';
import { normalizeVitrinaVideos } from '@/lib/vitrina-videos';
import { writeVitrinaVideos } from '@/lib/vitrina-videos-store';

export async function saveVitrinaVideos(input: {
  urls: string[];
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!secretsMatch(input.password ?? '', getNovedadesUnlockPassword())) {
    return { success: false, error: 'Contraseña incorrecta' };
  }

  const normalized = normalizeVitrinaVideos(input.urls);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }

  try {
    await writeVitrinaVideos(normalized.videos);
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] saveVitrinaVideos', e);
    return { success: false, error: 'No se pudieron guardar las URLs' };
  }
}
