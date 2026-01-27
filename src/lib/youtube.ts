/**
 * Utilidades para URLs de YouTube (embed, validación, extracción de videoId).
 */

const YOUTUBE_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?$/;

export function parseYouTubeUrl(url: string): { videoId: string } | null {
  const trimmed = url.trim();
  const match = trimmed.match(YOUTUBE_REGEX);
  if (!match) return null;
  return { videoId: match[1]! };
}

export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function isValidYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}
