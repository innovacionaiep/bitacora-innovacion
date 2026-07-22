/**
 * Utilidades para URLs de YouTube (embed, validación, extracción de videoId).
 * Soporta watch, embed, shorts y youtu.be.
 */

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function isYouTubeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'youtu.be' ||
    host === 'youtube.com' ||
    host.endsWith('.youtube.com')
  );
}

export function parseYouTubeUrl(
  url: string
): { videoId: string; isShort: boolean } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const urlObj = new URL(withProtocol);

    if (!isYouTubeHost(urlObj.hostname)) return null;

    const host = urlObj.hostname.toLowerCase();
    const segments = urlObj.pathname.split('/').filter(Boolean);

    let videoId: string | null = null;
    let isShort = false;

    if (host === 'youtu.be') {
      videoId = segments[0] ?? null;
    } else if (urlObj.pathname === '/watch') {
      videoId = urlObj.searchParams.get('v');
    } else if (segments[0] === 'shorts') {
      videoId = segments[1] ?? null;
      isShort = true;
    } else if (segments[0] === 'embed') {
      videoId = segments[1] ?? null;
    }

    if (!videoId || !VIDEO_ID_RE.test(videoId)) return null;
    return { videoId, isShort };
  } catch {
    return null;
  }
}

/** True si la URL es explícitamente un YouTube Short (`/shorts/...`). */
export function isYouTubeShortsUrl(url: string): boolean {
  return parseYouTubeUrl(url)?.isShort ?? false;
}

export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function isValidYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}
