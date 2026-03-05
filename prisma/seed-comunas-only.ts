/**
 * Script para cargar solo el listado de comunas desde
 * prisma/data/comunas_con_region.csv en la base de datos.
 * Útil para actualizar comunas sin ejecutar el seed completo.
 *
 * Uso: pnpm exec tsx prisma/seed-comunas-only.ts
 *
 * Si usas Supabase y da error de "prepared statement", usa conexión directa:
 * - Crea en .env: DATABASE_DIRECT_URL="postgresql://... (puerto 5432, no 6543)"
 * - O añade ?pgbouncer=true al final de tu DATABASE_URL
 *
 * Atención: elimina todas las comunas existentes y las reemplaza por las del CSV.
 */
import { PrismaClient } from '@prisma/client';
import { loadComunasFromCsv } from './data/load-comunas';

const databaseUrl =
  process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined
);

async function main() {
  console.log('📂 Cargando comunas desde prisma/data/comunas_con_region.csv...');
  const comunasData = loadComunasFromCsv();
  console.log(`   Encontradas ${comunasData.length} comunas.`);

  console.log('🧹 Eliminando relaciones proyecto-comuna y comunas existentes...');
  await prisma.proyectoComuna.deleteMany();
  await prisma.comuna.deleteMany();

  console.log('💾 Insertando comunas en la base de datos...');
  await Promise.all(
    comunasData.map((data) => prisma.comuna.create({ data }))
  );

  console.log(`✅ Listo: ${comunasData.length} comunas cargadas.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
