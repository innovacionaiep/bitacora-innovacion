export const MIDEIMPACTO_API_BASE =
  'https://api.mideimpacto.com/api/external/v1';

export const MIDEIMPACTO_FETCH_TIMEOUT_MS = 15_000;

export function mideimpactoErrorMessage(status: number): string {
  if (status === 401) return 'Token inválido o ausente';
  if (status === 403) return 'Sin permiso iniciativas:read';
  if (status === 429) return 'Límite de solicitudes excedido';
  if (status >= 500) return 'Error al procesar la solicitud';
  return 'No se pudieron cargar las iniciativas';
}

export function mideimpactoIniciativasUrl(
  page: number,
  baseUrl: string = MIDEIMPACTO_API_BASE,
): string {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/iniciativas`);
  url.searchParams.set('page', String(safePage));
  url.searchParams.set('include', 'adjuntos');
  return url.toString();
}

export function mideimpactoAdjuntoDescargarUrl(
  iniciativaId: string,
  adjuntoId: string,
  baseUrl: string = MIDEIMPACTO_API_BASE,
): string {
  const inic = iniciativaId.trim();
  const adj = adjuntoId.trim();
  return `${baseUrl.replace(/\/$/, '')}/iniciativas/${encodeURIComponent(inic)}/adjuntos/${encodeURIComponent(adj)}/descargar`;
}

export function resolveMideimpactoDownloadUrl(
  raw: string,
  baseUrl: string = MIDEIMPACTO_API_BASE,
): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = new URL(baseUrl.includes('://') ? baseUrl : `https://${baseUrl}`);
  const root = `${origin.protocol}//${origin.host}`;
  if (trimmed.startsWith('/')) return `${root}${trimmed}`;
  return new URL(trimmed, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

export function mideimpactoIniciativaDetailUrl(
  id: string,
  baseUrl: string = MIDEIMPACTO_API_BASE,
): string {
  const trimmed = id.trim();
  return `${baseUrl.replace(/\/$/, '')}/iniciativas/${encodeURIComponent(trimmed)}`;
}
