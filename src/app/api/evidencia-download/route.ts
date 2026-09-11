import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { PUBLIC_LINK_COOKIE } from '@/lib/public-link';
import { findActivePublicLinkProyectoId } from '@/lib/public-link-db';

async function allowSessionOrPublicLink(request: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (session?.user) return true;
  const token = request.cookies.get(PUBLIC_LINK_COOKIE)?.value;
  if (!token) return false;
  return (await findActivePublicLinkProyectoId(token)) != null;
}

/**
 * Proxy para descargar PDFs de evidencias con Content-Disposition: attachment.
 * Requiere sesión o un link público activo.
 */
export async function GET(request: NextRequest) {
  if (!(await allowSessionOrPublicLink(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  const filename =
    request.nextUrl.searchParams.get('filename') || 'documento.pdf';

  if (!url || !url.startsWith('https://res.cloudinary.com/')) {
    return NextResponse.json({ error: 'URL no válida' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/pdf,*/*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(
        '[evidencia-download] Cloudinary response:',
        res.status,
        res.statusText,
        errBody.slice(0, 300)
      );
      const msg =
        res.status === 401 || res.status === 403
          ? 'Cloudinary no permite la entrega de PDF. En el Dashboard: Security → activa "Allow delivery of PDF and ZIP files".'
          : 'No se pudo obtener el archivo desde el almacenamiento.';
      return new NextResponse(msg, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const contentType = (res.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (
      contentType === 'application/json' ||
      contentType.startsWith('text/html')
    ) {
      return new NextResponse('El recurso no está disponible como PDF.', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const blob = await res.blob();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = safeName.toLowerCase().endsWith('.pdf')
      ? safeName
      : `${safeName}.pdf`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${finalName}"`,
      },
    });
  } catch (e) {
    console.error('Error descargando evidencia PDF:', e);
    return new NextResponse('Error al descargar el archivo.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
