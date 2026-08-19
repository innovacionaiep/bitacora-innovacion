import {
  getVideoProviderLabel,
  parseVideoUrl,
  type VideoProvider,
} from '@/lib/video-url';
import type { VitrinaVideo } from '@/components/vitrina/vitrina-content';

export const VITRINA_VIDEOS_SETTING_KEY = 'vitrina_videos';
export const VITRINA_VIDEOS_MAX = 30;

export type NormalizeVitrinaVideosResult =
  | { ok: true; videos: VitrinaVideo[] }
  | { ok: false; error: string };

function tagForProvider(provider: VideoProvider): string {
  return getVideoProviderLabel(provider);
}

function toVideo(url: string, index: number, title?: string): VitrinaVideo | null {
  const parsed = parseVideoUrl(url);
  if (!parsed || parsed.externalOnly) return null;
  if (parsed.provider !== 'youtube' && parsed.provider !== 'vimeo') return null;

  return {
    title: title?.trim() || `Video ${index + 1}`,
    url: url.trim(),
    tag: tagForProvider(parsed.provider),
  };
}

/**
 * Acepta lista de URLs (string) o de objetos { url, title? }.
 * Solo YouTube y Vimeo embebibles. Filtra vacíos.
 */
export function normalizeVitrinaVideos(input: unknown): NormalizeVitrinaVideosResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'La lista de videos no es válida' };
  }
  if (input.length > VITRINA_VIDEOS_MAX) {
    return {
      ok: false,
      error: `Máximo ${VITRINA_VIDEOS_MAX} videos`,
    };
  }

  const videos: VitrinaVideo[] = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    let url = '';
    let title: string | undefined;

    if (typeof item === 'string') {
      url = item.trim();
    } else if (item && typeof item === 'object' && 'url' in item) {
      const rec = item as { url?: unknown; title?: unknown };
      url = typeof rec.url === 'string' ? rec.url.trim() : '';
      title = typeof rec.title === 'string' ? rec.title : undefined;
    } else {
      return { ok: false, error: `La entrada ${i + 1} no es una URL válida` };
    }

    if (!url) continue;

    const video = toVideo(url, videos.length, title);
    if (!video) {
      return {
        ok: false,
        error: `La URL ${i + 1} debe ser un enlace de YouTube o Vimeo`,
      };
    }
    videos.push(video);
  }

  if (videos.length === 0) {
    return { ok: false, error: 'Indica al menos un enlace de YouTube o Vimeo' };
  }

  return { ok: true, videos };
}

export function parseStoredVitrinaVideos(value: string | null | undefined): VitrinaVideo[] | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    const result = normalizeVitrinaVideos(parsed);
    return result.ok ? result.videos : null;
  } catch {
    return null;
  }
}
