import { NextRequest, NextResponse } from 'next/server';
import { fetchVimeoThumbnailUrl, parseVideoUrl } from '@/lib/video-url';

/**
 * GET /api/vimeo-oembed?url=...
 * Proxy público del oEmbed de Vimeo (miniatura). Evita fetch cross-origin
 * en el navegador, que suele romper con "Failed to fetch" (extensiones / red).
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')?.trim();
    if (!url) {
      return NextResponse.json(
        { error: 'Parámetro url requerido' },
        { status: 400 },
      );
    }

    const parsed = parseVideoUrl(url);
    if (!parsed || parsed.provider !== 'vimeo') {
      return NextResponse.json(
        { error: 'URL de Vimeo inválida' },
        { status: 400 },
      );
    }

    const pageUrl = parsed.pageUrl ?? url;
    const thumbnail_url = await fetchVimeoThumbnailUrl(pageUrl);

    return NextResponse.json(
      { thumbnail_url },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch {
    return NextResponse.json({ thumbnail_url: null });
  }
}
