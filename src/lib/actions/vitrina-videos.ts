'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz/guards';
import { normalizeVitrinaVideos } from '@/lib/vitrina-videos';
import { writeVitrinaVideos } from '@/lib/vitrina-videos-store';

export async function saveVitrinaVideos(input: {
  urls: string[];
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

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
