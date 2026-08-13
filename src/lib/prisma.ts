import { PrismaClient } from '@prisma/client';
import { getDatasourceUrl } from '@/lib/prisma-datasource-url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
