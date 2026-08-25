const DEFAULT_CALLBACK = '/';

function isSafeRelativePath(pathname: string): boolean {
  if (!pathname.startsWith('/')) return false;
  if (pathname.startsWith('//')) return false;
  if (pathname.includes('\\')) return false;
  if (pathname.startsWith('/auth')) return false;
  if (pathname.startsWith('/api')) return false;
  return true;
}

/** Ruta interna segura para volver tras el login. Cualquier valor raro cae al portal (`/`). */
export function sanitizeAuthCallbackUrl(
  raw: string | null | undefined,
): string {
  if (raw == null) return DEFAULT_CALLBACK;
  let value = raw.trim();
  if (!value) return DEFAULT_CALLBACK;
  try {
    value = decodeURIComponent(value);
  } catch {
    return DEFAULT_CALLBACK;
  }
  value = value.trim();
  if (!value.startsWith('/')) return DEFAULT_CALLBACK;

  try {
    const parsed = new URL(value, 'http://bitacora.local');
    if (parsed.origin !== 'http://bitacora.local') return DEFAULT_CALLBACK;
    if (!isSafeRelativePath(parsed.pathname)) return DEFAULT_CALLBACK;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_CALLBACK;
  }
}
