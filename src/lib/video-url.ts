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
   * Microsoft SharePoint/Stream no permiten iframe (login.microsoftonline
   * bloquea framing). Mostrar CTA para abrir en pestaña nueva.
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

/**
 * SharePoint / OneDrive / Stream: se reconocen y guardan, pero no se embeben
 * en iframe. El login de Microsoft (login.microsoftonline.com) envía
 * X-Frame-Options y rechaza la conexión dentro de la app.
 */
function parseSharePointUrl(url: string): ParsedVideoUrl | null {
  const trimmed = url.trim();
  const urlObj = tryParseUrl(trimmed);
  if (!urlObj || !isSharePointHost(urlObj.hostname)) return null;

  const path = urlObj.pathname.toLowerCase();
  const href = urlObj.href;

  let title: string | undefined;

  // stream.aspx?id=/path/to/file.mp4
  if (path.includes('stream.aspx')) {
    const fileId = urlObj.searchParams.get('id');
    if (fileId) {
      const decoded = decodeURIComponent(fileId);
      const base = decoded.split('/').filter(Boolean).pop();
      if (base) title = base.replace(/\+/g, ' ');
    }
  }

  // Links de compartir :v: / :u: — dejar la URL original para abrir en el navegador
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

/**
 * Detecta si un video de Vimeo es vertical (alto > ancho) vía oEmbed.
 * Falla en silent → false (se mantiene layout landscape).
 * Seguro para usar en cliente (solo fetch).
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
    const res = await fetch(endpoint);
    if (!res.ok) {
      vimeoOrientationCache.set(key, false);
      return false;
    }
    const data = (await res.json()) as VimeoOEmbed;
    const w = data.width ?? data.thumbnail_width ?? 0;
    const h = data.height ?? data.thumbnail_height ?? 0;
    const isVertical = h > w && w > 0;
    vimeoOrientationCache.set(key, isVertical);
    return isVertical;
  } catch {
    vimeoOrientationCache.set(key, false);
    return false;
  }
}

/**
 * Orientación vertical sin dependencias nativas (cliente-safe).
 * Google Drive se resuelve en /api/video-orientation (sharp) o vía Image() en UI.
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
