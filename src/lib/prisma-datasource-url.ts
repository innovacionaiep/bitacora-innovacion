/** 3 conexiones por isolate: permite solapar authz + findUnique. 1 las serializa. */
export const PROD_PRISMA_CONNECTION_LIMIT = '3';

/**
 * Ajusta DATABASE_URL para el pooler de Supabase.
 * En production, si no hay connection_limit, usa 3 (no 1: Promise.all no puede solapar).
 */
export function getDatasourceUrl(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV
): string | undefined {
  if (!databaseUrl) return undefined;
  const [baseUrl, query] = databaseUrl.split('?');
  const params = new URLSearchParams(query ?? '');
  if (!params.has('pgbouncer')) params.set('pgbouncer', 'true');
  if (nodeEnv === 'production' && !params.has('connection_limit')) {
    params.set('connection_limit', PROD_PRISMA_CONNECTION_LIMIT);
  }
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}
