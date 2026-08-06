/**
 * Read-only audit: lists accounts with more than one participation role
 * in the same project (excluding admin@test.cl).
 *
 * Usage: pnpm exec tsx scripts/audit-participacion-duplicados.ts
 * Does NOT delete or modify any data.
 */
import { PrismaClient } from '@prisma/client';

const EXCEPTION_EMAIL = 'admin@test.cl';

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        proyecto_id: string;
        user_id: string | null;
        email: string | null;
        roles: string;
        cnt: bigint;
      }>
    >`
      SELECT
        proyecto_id,
        user_id,
        LOWER(email) AS email,
        STRING_AGG(DISTINCT rol, ', ' ORDER BY rol) AS roles,
        COUNT(*)::bigint AS cnt
      FROM proyecto_participantes
      WHERE user_id IS NOT NULL
         OR (email IS NOT NULL AND TRIM(email) <> '')
      GROUP BY proyecto_id, user_id, LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC, proyecto_id
    `;

    const filtered = rows.filter(
      (r) => (r.email ?? '').toLowerCase() !== EXCEPTION_EMAIL
    );

    console.log(
      `Duplicados (excl. ${EXCEPTION_EMAIL}): ${filtered.length}`
    );
    for (const r of filtered) {
      console.log(
        `- proyecto=${r.proyecto_id} userId=${r.user_id ?? '—'} email=${r.email ?? '—'} roles=[${r.roles}] count=${r.cnt}`
      );
    }

    const exceptionDupes = rows.filter(
      (r) => (r.email ?? '').toLowerCase() === EXCEPTION_EMAIL
    );
    if (exceptionDupes.length > 0) {
      console.log(
        `\nNota: ${exceptionDupes.length} grupo(s) multi-rol para ${EXCEPTION_EMAIL} (permitido).`
      );
    }

    if (filtered.length === 0) {
      console.log(
        '\nSin duplicados bloqueantes. Unicidad se aplica en Server Actions (1 rol/cuenta/proyecto).'
      );
      console.log(
        'No se aplica índice UNIQUE en BD para preservar la excepción admin@test.cl.'
      );
    } else {
      console.log(
        '\nResuelve estos duplicados desde la UI de participantes antes de confiar en la unicidad.'
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
