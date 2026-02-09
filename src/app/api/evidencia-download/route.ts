import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy para descargar PDFs de evidencias con Content-Disposition: attachment.
 * Así el navegador descarga el archivo en lugar de intentar mostrarlo.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'documento.pdf';

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
        'Accept': 'application/pdf,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[evidencia-download] Cloudinary response:', res.status, res.statusText, errBody.slice(0, 300));
      const msg = res.status === 403
        ? 'Cloudinary no permite la entrega de PDF. En el Dashboard: Security → activa "Allow delivery of PDF and ZIP files".'
        : 'No se pudo obtener el archivo desde el almacenamiento.';
      return new NextResponse(msg, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType === 'application/json' || contentType.startsWith('text/html')) {
      return new NextResponse('El recurso no está disponible como PDF.', {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const blob = await res.blob();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalName = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;

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
