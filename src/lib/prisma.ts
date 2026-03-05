import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Con pooler (Supabase): evitar "prepared statement does not exist" y en prod limitar conexiones.
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const [baseUrl, query] = url.split('?');
  const params = new URLSearchParams(query ?? '');
  if (!params.has('pgbouncer')) params.set('pgbouncer', 'true');
  if (process.env.NODE_ENV === 'production' && !params.has('connection_limit')) params.set('connection_limit', '1');
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

const datasourceUrl = getDatasourceUrl();
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl && { datasourceUrl }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

// Reutilizar el mismo cliente en serverless (Vercel) para no agotar el pool de conexiones.
globalForPrisma.prisma = prisma;

export default prisma;
