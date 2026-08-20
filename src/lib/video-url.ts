/**
 * Utilidades para URLs de video embebibles en proyectos.
 * Soporta YouTube, Vimeo, Google Drive y Microsoft SharePoint/OneDrive.
 */

import { parseYouTubeUrl } from '@/lib/youtube';

export type VideoProvider =
  | 'youtube'
  | 'vimeo'
  | 'google-drive'
  | 'sharepoint';

export type ParsedVideoUrl = {
  provider: VideoProvider;
  embedUrl: string;
  /** YouTube Shorts u orientación vertical detectada. */
  isShort?: boolean;
  /** URL canónica para oEmbed / abrir en nueva pestaña. */
  pageUrl?: string;
  videoId?: string;
  /** Nombre de archivo u título si se puede inferir. */
  title?: string;
  /**
   * Si true, no embebible en iframe (p. ej. 1drv.ms o login de Microsoft).
   * Stream/embed.aspx de SharePoint sí se puede iframear.
   */
  externalOnly?: boolean;
};

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(withProtocol(url.trim()));
  } catch {
    return null;
  }
}

function isVimeoHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'vimeo.com' ||
    host.endsWith('.vimeo.com') ||
    host === 'player.vimeo.com'
  );
}

function parseVimeoUrl(url: string): ParsedVideoUrl | null {
  const urlObj = tryParseUrl(url);
  if (!urlObj || !isVimeoHost(urlObj.hostname)) return null;

  const segments = urlObj.pathname.split('/').filter(Boolean);
  let videoId: string | null = null;
  let privacyHash: string | null = null;

  // player.vimeo.com/video/{id}
  if (segments[0] === 'video' && segments[1]) {
    videoId = segments[1];
    privacyHash = urlObj.searchParams.get('h');
  } else {
    // vimeo.com/{id} | vimeo.com/{id}/{privacyHash} | channels/groups…
    const idIdx = segments.findIndex((s) => /^\d{6,}$/.test(s));
    if (idIdx >= 0) {
      videoId = segments[idIdx] ?? null;
      const next = segments[idIdx + 1];
      if (next && /^[a-zA-Z0-9]+$/.test(next) && !/^\d{6,}$/.test(next)) {
        privacyHash = next;
      }
    }
  }

  if (!videoId) return null;

  const embed = new URL(`https://player.vimeo.com/video/${videoId}`);
  if (privacyHash) embed.searchParams.set('h', privacyHash);
  // Facilita fullscreen y player responsive
  embed.searchParams.set('playsinline', '1');
  embed.searchParams.set('title', '0');
  embed.searchParams.set('byline', '0');
  embed.searchParams.set('portrait', '0');

  const pageUrl = privacyHash
    ? `https://vimeo.com/${videoId}/${privacyHash}`
    : `https://vimeo.com/${videoId}`;

  return {
    provider: 'vimeo',
    embedUrl: embed.href,
    pageUrl,
    videoId,
  };
}

function isGoogleDriveHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'drive.google.com' ||
    host === 'docs.google.com' ||
    host.endsWith('.drive.google.com')
  );
}

function parseGoogleDriveUrl(url: string): ParsedVideoUrl | null {
  const urlObj = tryParseUrl(url);
  if (!urlObj || !isGoogleDriveHost(urlObj.hostname)) return null;

  const segments = urlObj.pathname.split('/').filter(Boolean);
  let fileId: string | null = null;

  // /file/d/{id}/view|preview|edit
  const fileIdx = segments.indexOf('file');
  if (fileIdx >= 0 && segments[fileIdx + 1] === 'd' && segments[fileIdx + 2]) {
    fileId = segments[fileIdx + 2];
  }

  // /open?id=... o ?id=...
  if (!fileId) {
    fileId = urlObj.searchParams.get('id');
  }

  // /uc?id=... /uc?export=download&id=...
  if (!fileId && segments[0] === 'uc') {
    fileId = urlObj.searchParams.get('id');
  }

  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) return null;

  return {
    provider: 'google-drive',
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    pageUrl: `https://drive.google.com/file/d/${fileId}/view`,
    videoId: fileId,
  };
}

function isSharePointHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'onedrive.live.com' ||
    host === '1drv.ms' ||
    host.endsWith('.sharepoint.com') ||
    host.endsWith('.sharepoint-df.com') ||
    host.endsWith('.onedrive.com') ||
    (host.endsWith('.microsoft.com') && host.includes('sharepoint'))
  );
}

function filenameFromSharePointId(fileId: string | null): string | undefined {
  if (!fileId) return undefined;
  let decoded = fileId;
  try {
    decoded = decodeURIComponent(fileId);
  } catch {
    /* ya viene decodificado */
  }
  const base = decoded.split('/').filter(Boolean).pop();
  return base ? base.replace(/\+/g, ' ') : undefined;
}

/**
 * Stream en SharePoint: stream.aspx (barra de direcciones) se convierte a
 * embed.aspx, que sí permite iframe. 1drv.ms y otros enlaces cortos siguen
 * como CTA externo porque el login de Microsoft bloquea framing.
 */
function parseSharePointUrl(url: string): ParsedVideoUrl | null {
  const trimmed = url.trim();
  const urlObj = tryParseUrl(trimmed);
  if (!urlObj || !isSharePointHost(urlObj.hostname)) return null;

  const path = urlObj.pathname;
  const pathLower = path.toLowerCase();
  const href = urlObj.href;
  const fileId = urlObj.searchParams.get('id');
  const uniqueId =
    urlObj.searchParams.get('UniqueId') || urlObj.searchParams.get('uniqueId');
  const title = filenameFromSharePointId(fileId);

  const isStreamPlayer =
    pathLower.includes('/stream.aspx') || pathLower.includes('/videoembed.aspx');
  const isEmbedPage = pathLower.includes('/embed.aspx');

  if (isStreamPlayer || isEmbedPage) {
    const embedPath = path
      .replace(/stream\.aspx/i, 'embed.aspx')
      .replace(/videoembed\.aspx/i, 'embed.aspx');
    const embed = new URL(embedPath, urlObj.origin);
    if (fileId) embed.searchParams.set('id', fileId);
    if (uniqueId) embed.searchParams.set('UniqueId', uniqueId);
    embed.searchParams.set('embed', '{"ust":true,"hv":"CopyEmbedCode"}');

    return {
      provider: 'sharepoint',
      embedUrl: embed.href,
      pageUrl: href,
      title,
      videoId: uniqueId || fileId || undefined,
    };
  }

  return {
    provider: 'sharepoint',
    embedUrl: href,
    pageUrl: href,
    title,
    externalOnly: true,
  };
}

export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  const yt = parseYouTubeUrl(trimmed);
  if (yt) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${yt.videoId}?playsinline=1`,
      isShort: yt.isShort,
    };
  }

  return (
    parseVimeoUrl(trimmed) ??
    parseGoogleDriveUrl(trimmed) ??
    parseSharePointUrl(trimmed)
  );
}

export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

export function getVideoProviderLabel(provider: VideoProvider): string {
  switch (provider) {
    case 'youtube':
      return 'YouTube';
    case 'vimeo':
      return 'Vimeo';
    case 'google-drive':
      return 'Google Drive';
    case 'sharepoint':
      return 'SharePoint';
  }
}

type VimeoOEmbed = {
  width?: number;
  height?: number;
  thumbnail_width?: number;
  thumbnail_height?: number;
};

const vimeoOrientationCache = new Map<string, boolean>();

/** True si algún par de dimensiones (player o thumbnail) es portrait. */
export function isVerticalFromVimeoOEmbed(data: VimeoOEmbed): boolean {
  const pairs: Array<[number, number]> = [];
  if (data.width && data.height) pairs.push([data.width, data.height]);
  if (data.thumbnail_width && data.thumbnail_height) {
    pairs.push([data.thumbnail_width, data.thumbnail_height]);
  }
  return pairs.some(([w, h]) => h > w && w > 0);
}

/**
 * Detecta si un video de Vimeo es vertical (alto > ancho) vía oEmbed.
 * Falla en silencio → false (layout landscape). No cachea errores: un fallo
 * transitorio no debe dejar el video como landscape hasta reiniciar el proceso.
 * Seguro para usar en cliente (oEmbed de Vimeo permite CORS *).
 */
export async function detectVimeoIsVertical(
  pageUrl: string
): Promise<boolean> {
  const key = pageUrl.trim();
  if (!key) return false;

  const cached = vimeoOrientationCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return false;

    const data = (await res.json()) as VimeoOEmbed;
    const isVertical = isVerticalFromVimeoOEmbed(data);
    vimeoOrientationCache.set(key, isVertical);
    return isVertical;
  } catch {
    return false;
  }
}

/**
 * Orientación vertical sin dependencias nativas (cliente-safe).
 * Google Drive se resuelve vía Image() en UI (sin sharp en Functions).
 */
export async function detectVideoIsVertical(url: string): Promise<boolean> {
  const parsed = parseVideoUrl(url);
  if (!parsed) return false;
  if (parsed.isShort) return true;

  if (parsed.provider === 'vimeo' && parsed.pageUrl) {
    return detectVimeoIsVertical(parsed.pageUrl);
  }
  return false;
}
