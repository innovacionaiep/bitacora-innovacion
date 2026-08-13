import { NextRequest, NextResponse } from 'next/server';
import { detectVimeoIsVertical, parseVideoUrl } from '@/lib/video-url';

type SharpInstance = typeof import('sharp').default;

const driveOrientationCache = new Map<string, boolean>();

async function loadSharp(): Promise<SharpInstance | null> {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    return null;
  }
}

/**
 * Drive suele generar miniaturas landscape con el video vertical letterboxed
 * (franjas negras laterales). Detecta eso muestreando bordes vs centro.
 */
async function thumbnailLooksLetterboxedVertical(
  sharp: SharpInstance,
  buf: Buffer
): Promise<boolean> {
  const { data, info } = await sharp(buf)
    .resize({ width: 160, height: 90, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels;

  if (h > w) return true;
  if (w < 16 || h < 16) return false;

  const luminance = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    return (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
  };

  const strip = Math.max(2, Math.floor(w * 0.12));
  const y0 = Math.floor(h * 0.15);
  const y1 = Math.floor(h * 0.85);
  const mid0 = Math.floor(w * 0.38);
  const mid1 = Math.floor(w * 0.62);

  let leftDark = 0;
  let leftN = 0;
  let rightDark = 0;
  let rightN = 0;
  let centerDark = 0;
  let centerN = 0;

  for (let y = y0; y < y1; y += 2) {
    for (let x = 0; x < strip; x += 2) {
      if (luminance(x, y) < 28) leftDark++;
      leftN++;
    }
    for (let x = w - strip; x < w; x += 2) {
      if (luminance(x, y) < 28) rightDark++;
      rightN++;
    }
    for (let x = mid0; x < mid1; x += 2) {
      if (luminance(x, y) < 28) centerDark++;
      centerN++;
    }
  }

  const leftRatio = leftN ? leftDark / leftN : 0;
  const rightRatio = rightN ? rightDark / rightN : 0;
  const centerRatio = centerN ? centerDark / centerN : 1;

  return leftRatio > 0.72 && rightRatio > 0.72 && centerRatio < 0.45;
}

async function detectGoogleDriveIsVertical(fileId: string): Promise<boolean> {
  const id = fileId.trim();
  if (!id) return false;

  const cached = driveOrientationCache.get(id);
  if (cached !== undefined) return cached;

  const sharp = await loadSharp();
  if (!sharp) {
    driveOrientationCache.set(id, false);
    return false;
  }

  const thumbUrls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1000`,
  ];

  for (const thumbUrl of thumbUrls) {
    try {
      const res = await fetch(thumbUrl, {
        redirect: 'follow',
        headers: { Accept: 'image/*,*/*' },
      });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/html')) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 24) continue;

      const meta = await sharp(buf).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w <= 0 || h <= 0) continue;

      const isVertical =
        h > w || (await thumbnailLooksLetterboxedVertical(sharp, buf));
      driveOrientationCache.set(id, isVertical);
      return isVertical;
    } catch {
      /* siguiente URL */
    }
  }

  driveOrientationCache.set(id, false);
  return false;
}

/**
 * GET /api/video-orientation?url=...
 * Devuelve { vertical: boolean } para YouTube Shorts, Vimeo y Google Drive.
 * sharp se carga en runtime; si el binario nativo falla, responde landscape.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')?.trim();
    if (!url) {
      return NextResponse.json(
        { error: 'Parámetro url requerido' },
        { status: 400 }
      );
    }

    const parsed = parseVideoUrl(url);
    if (!parsed) {
      return NextResponse.json({ vertical: false });
    }

    if (parsed.isShort) {
      return NextResponse.json({ vertical: true, provider: parsed.provider });
    }

    let vertical = false;
    if (parsed.provider === 'vimeo' && parsed.pageUrl) {
      vertical = await detectVimeoIsVertical(parsed.pageUrl);
    } else if (parsed.provider === 'google-drive' && parsed.videoId) {
      vertical = await detectGoogleDriveIsVertical(parsed.videoId);
    }

    return NextResponse.json({ vertical, provider: parsed.provider });
  } catch {
    return NextResponse.json({ vertical: false });
  }
}
