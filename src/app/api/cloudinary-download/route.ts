import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Proxy autenticado para descargar archivos raw de Cloudinary (PDF, DOCX, etc.)
 * con Content-Disposition: attachment.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  const filename =
    request.nextUrl.searchParams.get('filename') || 'documento';
  const dispositionParam =
    request.nextUrl.searchParams.get('disposition') || 'attachment';
  const disposition =
    dispositionParam === 'inline' ? 'inline' : 'attachment';

  if (!url || !url.startsWith('https://res.cloudinary.com/')) {
    return NextResponse.json({ error: 'URL no válida' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept:
          'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/octet-stream,*/*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(
        '[cloudinary-download] Cloudinary response:',
        res.status,
        res.statusText,
        errBody.slice(0, 300)
      );
      const msg =
        res.status === 403
          ? 'Cloudinary no permite la entrega del archivo. En el Dashboard: Security → activa "Allow delivery of PDF and ZIP files" si aplica.'
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
      return new NextResponse('El recurso no está disponible para descarga.', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const blob = await res.blob();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const lower = safeName.toLowerCase();
    let finalName = safeName;
    if (!lower.includes('.')) {
      if (contentType.includes('pdf')) finalName = `${safeName}.pdf`;
      else if (
        contentType.includes('wordprocessingml') ||
        contentType.includes('msword')
      ) {
        finalName = `${safeName}.docx`;
      }
    }

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${finalName}"`,
      },
    });
  } catch (e) {
    console.error('Error descargando archivo Cloudinary:', e);
    return new NextResponse('Error al descargar el archivo.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
