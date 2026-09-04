import { NextRequest, NextResponse } from 'next/server';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import {
  MIDEIMPACTO_FETCH_TIMEOUT_MS,
  mideimpactoAdjuntoDescargarUrl,
  mideimpactoErrorMessage,
} from '@/lib/mideimpacto-client';
import { portalCanSeeView } from '@/lib/portal-guest-access';
import { getMideimpactoApiKey } from '@/lib/secrets/env-secrets';

function safeId(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.length > 80) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  return trimmed;
}

function safeFilename(value: string | null): string {
  const trimmed = value?.trim() ?? '';
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return cleaned || 'adjunto';
}

export async function GET(request: NextRequest) {
  const access = await resolvePortalAccess();
  if (!portalCanSeeView(access.level, 'vinculamos')) {
    return NextResponse.json(
      { error: 'No tienes acceso a esta vista' },
      { status: 403 },
    );
  }

  const apiKey = getMideimpactoApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API de MideImpacto no configurada' },
      { status: 500 },
    );
  }

  const iniciativa = safeId(request.nextUrl.searchParams.get('iniciativa'));
  const adjunto = safeId(request.nextUrl.searchParams.get('adjunto'));
  if (!iniciativa || !adjunto) {
    return NextResponse.json({ error: 'Adjunto no válido' }, { status: 400 });
  }

  const filename = safeFilename(request.nextUrl.searchParams.get('nombre'));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MIDEIMPACTO_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      mideimpactoAdjuntoDescargarUrl(iniciativa, adjunto),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: '*/*',
        },
        cache: 'no-store',
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: mideimpactoErrorMessage(response.status) },
        { status: response.status === 404 ? 404 : 502 },
      );
    }
    const blob = await response.blob();
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const disposition =
      response.headers.get('content-disposition') ||
      `attachment; filename="${filename}"`;
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudieron cargar las iniciativas' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
